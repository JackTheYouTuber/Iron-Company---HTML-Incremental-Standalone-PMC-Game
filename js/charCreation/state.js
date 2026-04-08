// ===================== CHAR CREATION: STATE =====================
// Central state for the character creation modal.
// All other charCreation modules read/write this object only.

const CC = {
    selectedOriginId: null,
    showLore:         {},    // { originId: bool } — lore panels toggled open
    nameValue:        '',    // mirrors the name input for validation
};

function ccReset() {
    CC.selectedOriginId = null;
    CC.showLore         = {};
    CC.nameValue        = '';
}

function ccSelectOrigin(id) {
    CC.selectedOriginId = id;
}

function ccToggleLore(id) {
    CC.showLore[id] = !CC.showLore[id];
}
