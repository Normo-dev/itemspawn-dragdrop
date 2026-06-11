import { ScriptOpcode } from '#/engine/script/ScriptOpcode.js';
import { ActivePlayer, checkedHandler } from '#/engine/script/ScriptPointer.js';
import { CommandHandlers } from '#/engine/script/ScriptRunner.js';
import { addItemSpawnItem, openItemSpawnSearch, turnItemSpawnSearchPage } from '#/engine/script/handlers/ItemSpawnDebug.js';

const DebugOps: CommandHandlers = {
    [ScriptOpcode.ERROR]: state => {
        throw new Error(state.popString());
    },

    [ScriptOpcode.CONSOLE]: state => {
        console.log(state.popString());
    },

    [ScriptOpcode.TIMESPENT]: state => {
        state.timespent = performance.now();
    },

    [ScriptOpcode.GETTIMESPENT]: state => {
        const elapsed = performance.now() - state.timespent;

        if (state.popInt() === 1) {
            // microseconds
            state.pushInt(elapsed * 1000);
        } else {
            // milliseconds
            state.pushInt(elapsed);
        }
    },

    [ScriptOpcode.ITEMSPAWN_OPEN]: checkedHandler(ActivePlayer, state => {
        openItemSpawnSearch(state.activePlayer, state.popString());
    }),

    [ScriptOpcode.ITEMSPAWN_PAGE]: checkedHandler(ActivePlayer, state => {
        turnItemSpawnSearchPage(state.activePlayer, state.popInt());
    }),

    [ScriptOpcode.ITEMSPAWN_ADD]: checkedHandler(ActivePlayer, state => {
        const [obj, count] = state.popInts(2);
        addItemSpawnItem(state.activePlayer, obj, count);
    })
};

export default DebugOps;
