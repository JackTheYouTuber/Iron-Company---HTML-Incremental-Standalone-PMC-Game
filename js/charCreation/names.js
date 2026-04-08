// ===================== CHAR CREATION: NAMES =====================
// Random commander name generator.
// Names are thematically appropriate for a dark medieval setting.

const CC_NAME_PARTS = {
    prefixes: [
        'Aldric', 'Bram', 'Cael', 'Daven', 'Edric', 'Finn', 'Gorin', 'Hadric',
        'Ivar', 'Jorn', 'Kaed', 'Lorcan', 'Maren', 'Navar', 'Oswin', 'Pell',
        'Roan', 'Seren', 'Talion', 'Uric', 'Vorn', 'Wren', 'Xan', 'Ysel', 'Zane',
        'Astrid', 'Brynn', 'Cira', 'Dela', 'Eira', 'Faye', 'Genna', 'Hild',
        'Isolde', 'Jael', 'Kira', 'Lyra', 'Mira', 'Nessa', 'Orla', 'Petra',
        'Reva', 'Sigri', 'Thea', 'Una', 'Varis', 'Wyla',
    ],
    suffixes: [
        'of the Ash Road', 'the Unbowed', 'Ironhand', 'Greymantle', 'the Scarred',
        'Coldwater', 'of Norn\'s End', 'the Wanderer', 'Blackthorn', 'the Unbroken',
        'of the Long March', 'the Pale', 'Oathkeeper', 'the Forgotten', 'Duskborn',
        'of the Bitter North', 'the Grim', 'Stoneback', 'the Unlucky', 'Halvard',
        '', '', '', '', // empty suffix more common — plain names feel right
    ],
};

function ccRandomName() {
    const p = CC_NAME_PARTS.prefixes;
    const s = CC_NAME_PARTS.suffixes;
    const prefix = p[Math.floor(Math.random() * p.length)];
    const suffix = s[Math.floor(Math.random() * s.length)];
    return suffix ? `${prefix} ${suffix}` : prefix;
}
