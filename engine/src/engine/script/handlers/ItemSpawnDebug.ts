import Component from '#/cache/config/Component.js';
import InvType from '#/cache/config/InvType.js';
import ObjType from '#/cache/config/ObjType.js';
import Player from '#/engine/entity/Player.js';
import IfSetScrollPos from '#/network/game/server/model/IfSetScrollPos.js';
import IfSetText from '#/network/game/server/model/IfSetText.js';
import { tryParseInt } from '#/util/TryParse.js';

const PAGE_SIZE = 240;

type ItemSearchFilters = {
    members: boolean;
    free: boolean;
    trade: boolean;
    untrade: boolean;
    wear: boolean;
    stack: boolean;
    note: boolean;
    cert: boolean;
};

type ParsedItemSearch = {
    terms: string[];
    directId: number;
    filterText: string;
    matches: number[];
};

type ItemSearchState = {
    query: string;
    filterText: string;
    matches: number[];
    page: number;
};

const EMPTY_FILTERS: ItemSearchFilters = {
    members: false,
    free: false,
    trade: false,
    untrade: false,
    wear: false,
    stack: false,
    note: false,
    cert: false
};

const itemSearchStates = new WeakMap<Player, ItemSearchState>();

function getItemText(type: ObjType): string {
    return `${type.name ?? ''} ${type.debugname ?? ''}`.toLowerCase();
}

function isWearable(type: ObjType): boolean {
    return type.wearpos !== -1 || type.wearpos2 !== -1 || type.wearpos3 !== -1 || type.manwear !== -1 || type.womanwear !== -1;
}

function hasNote(type: ObjType): boolean {
    return type.certtemplate === -1 && type.certlink >= 0;
}

function flagText(filters: ItemSearchFilters): string {
    const flags: string[] = [];
    if (filters.members) {
        flags.push('members');
    }
    if (filters.free) {
        flags.push('free');
    }
    if (filters.trade) {
        flags.push('trade');
    }
    if (filters.untrade) {
        flags.push('untrade');
    }
    if (filters.wear) {
        flags.push('wear');
    }
    if (filters.stack) {
        flags.push('stack');
    }
    if (filters.note) {
        flags.push('note');
    }
    if (filters.cert) {
        flags.push('cert');
    }

    return flags.length === 0 ? 'all' : flags.join(', ');
}

function parseItemSearch(query: string): ParsedItemSearch | null {
    const filters: ItemSearchFilters = { ...EMPTY_FILTERS };
    const terms: string[] = [];
    const args = query
        .toLowerCase()
        .trim()
        .split(/\s+/)
        .filter(Boolean);

    for (const arg of args) {
        switch (arg) {
            case '--members':
            case '-m':
                filters.members = true;
                break;
            case '--free':
            case '-f':
                filters.free = true;
                break;
            case '--trade':
            case '--tradeable':
            case '-t':
                filters.trade = true;
                break;
            case '--untrade':
            case '--untradeable':
            case '-u':
                filters.untrade = true;
                break;
            case '--wear':
            case '--wearable':
            case '-w':
                filters.wear = true;
                break;
            case '--stack':
            case '--stackable':
            case '-s':
                filters.stack = true;
                break;
            case '--note':
            case '--noted':
            case '-n':
                filters.note = true;
                break;
            case '--cert':
                filters.cert = true;
                break;
            default:
                terms.push(arg);
                break;
        }
    }

    if (terms.length === 0 && flagText(filters) === 'all') {
        return null;
    }

    const directId = terms.length === 1 && /^\d+$/.test(terms[0]) ? tryParseInt(terms[0], -1) : -1;
    const matches = findItemMatches(terms, filters, directId);

    return {
        terms,
        directId,
        filterText: flagText(filters),
        matches
    };
}

function matchesFilters(type: ObjType, filters: ItemSearchFilters): boolean {
    if (filters.members && !type.members) {
        return false;
    }
    if (filters.free && type.members) {
        return false;
    }
    if (filters.trade && !type.tradeable) {
        return false;
    }
    if (filters.untrade && type.tradeable) {
        return false;
    }
    if (filters.wear && !isWearable(type)) {
        return false;
    }
    if (filters.stack && !type.stackable) {
        return false;
    }
    if (filters.note && !hasNote(type)) {
        return false;
    }

    return true;
}

function scoreMatch(id: number, type: ObjType, terms: string[], directId: number): number {
    if (directId === id) {
        return 0;
    }

    const name = type.name?.toLowerCase() ?? '';
    const debugname = type.debugname?.toLowerCase() ?? '';
    const query = terms.join(' ');

    if (name === query || debugname === query) {
        return 1;
    }
    if (name.startsWith(query) || debugname.startsWith(query)) {
        return 2;
    }
    if (name.includes(query) || debugname.includes(query)) {
        return 3;
    }

    return 4;
}

function findItemMatches(terms: string[], filters: ItemSearchFilters, directId: number): number[] {
    const scored: Array<{ id: number; score: number; name: string }> = [];

    for (let id = 0; id < ObjType.count; id++) {
        const type = ObjType.get(id);
        if (!type || !type.name) {
            continue;
        }

        const direct = directId === id;
        if (!direct && type.dummyitem !== 0) {
            continue;
        }
        if (!direct && type.certtemplate !== -1 && !filters.cert) {
            continue;
        }
        if (!matchesFilters(type, filters)) {
            continue;
        }

        const text = getItemText(type);
        if (!direct && terms.some(term => !text.includes(term))) {
            continue;
        }

        scored.push({
            id,
            score: scoreMatch(id, type, terms, directId),
            name: type.name.toLowerCase()
        });
    }

    scored.sort((a, b) => a.score - b.score || a.name.localeCompare(b.name) || a.id - b.id);
    return scored.map(item => item.id);
}

function getComponentId(name: string): number {
    return Component.getId(`spawn_main:${name}`);
}

function itemSearchComponentsReady(): boolean {
    return InvType.getId('dev_itemsearch') !== -1 && Component.getId('spawn_main') !== -1 && getComponentId('items') !== -1 && getComponentId('title') !== -1;
}

export function openItemSpawnSearch(player: Player, query: string): boolean {
    if (!itemSearchComponentsReady()) {
        player.messageGame('Item spawn UI unavailable (cache not built).');
        return false;
    }

    const parsed = parseItemSearch(query);
    if (!parsed) {
        player.messageGame('Usage: ::~item <name|id> [--filter]');
        return false;
    }

    if (parsed.matches.length === 0) {
        player.messageGame(`No items found matching '${parsed.terms.join(' ')}'.`);
        return false;
    }

    const state: ItemSearchState = {
        query: parsed.directId !== -1 ? `id ${parsed.directId}` : parsed.terms.join(' '),
        filterText: parsed.filterText,
        matches: parsed.matches,
        page: 0
    };

    itemSearchStates.set(player, state);
    refreshItemSpawnSearch(player, state);
    player.openMainModal(Component.getId('spawn_main'));
    return true;
}

export function turnItemSpawnSearchPage(player: Player, delta: number): boolean {
    const state = itemSearchStates.get(player);
    if (!state) {
        player.messageGame('No active item search.');
        return false;
    }

    const maxPage = Math.max(0, Math.ceil(state.matches.length / PAGE_SIZE) - 1);
    const nextPage = Math.max(0, Math.min(maxPage, state.page + delta));
    if (nextPage === state.page) {
        player.messageGame(delta > 0 ? 'Already on the last item page.' : 'Already on the first item page.');
        return true;
    }

    state.page = nextPage;
    refreshItemSpawnSearch(player, state);
    return true;
}

export function addItemSpawnItem(player: Player, obj: number, count: number): boolean {
    const type = ObjType.get(obj);
    if (!type) {
        player.messageGame(`Unknown item id ${obj}.`);
        return false;
    }

    if (count <= 0) {
        return false;
    }

    player.invAdd(InvType.INV, obj, count);
    return true;
}

function refreshItemSpawnSearch(player: Player, state: ItemSearchState): void {
    const devInv = InvType.getId('dev_itemsearch');
    const itemsCom = getComponentId('items');
    const titleCom = getComponentId('title');
    const summaryCom = getComponentId('summary');
    const filterCom = getComponentId('filters');
    const layerCom = getComponentId('items_layer');

    player.invClear(devInv);

    const pageStart = state.page * PAGE_SIZE;
    const pageItems = state.matches.slice(pageStart, pageStart + PAGE_SIZE);
    for (let slot = 0; slot < pageItems.length; slot++) {
        player.invSet(devInv, pageItems[slot], 1, slot);
    }

    const maxPage = Math.max(0, Math.ceil(state.matches.length / PAGE_SIZE) - 1);
    const shownStart = pageStart + 1;
    const shownEnd = pageStart + pageItems.length;

    player.write(new IfSetText(titleCom, `Item Spawn - ${state.query}`));
    player.write(new IfSetText(summaryCom, `Showing ${shownStart}-${shownEnd} of ${state.matches.length} (page ${state.page + 1}/${maxPage + 1})`));
    player.write(new IfSetText(filterCom, `Filters: ${state.filterText}`));
    player.write(new IfSetScrollPos(layerCom, 0));
    player.invListenOnCom(devInv, itemsCom, player.uid);
}
