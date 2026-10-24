/* =========================================================
   光影绘梦师 — level data
   All coordinates are world pixels (y grows down).
   ========================================================= */
(function () {
  const L = window.Lumen;

  const PALETTES = {
    field: ['#ff7a6b', '#ffc857', '#7bd88f', '#5bc0eb', '#b28dff', '#ff8fc7'],
    cliff: ['#ff9f7a', '#ffd166', '#6fd6c3', '#6a9cff', '#c79bff', '#ff8fb1'],
    mist: ['#8fe3c8', '#7fc8f8', '#b8a1ff', '#ffb3c7', '#ffe29a', '#9be7ff'],
    tower: ['#88a8ff', '#b28dff', '#ff8fd0', '#ffd166', '#7be8ff', '#f6a5ff'],
    bloom: ['#ff6b6b', '#ffa94d', '#ffd43b', '#69db7c', '#4dabf7', '#9775fa', '#f783ac']
  };

  const levels = [
    {
      id: 'field',
      no: '一',
      name: '白纸原野',
      en: 'THE BLANK FIELD',
      subtitle: '颜色睡着的地方',
      theme: 'field',
      palette: PALETTES.field,
      bg: ['#f4eee3', '#e8e0d1'],
      seed: 1101,
      bounds: { w: 2800, h: 1450 },
      spawn: { x: 250, y: 984 },
      startInk: 100,
      strokeLife: 26,
      hint: '按住鼠标左键拖拽，画一座桥。松开笔，墨迹就会成形。',
      subhint: '墨会随时间褪去 —— 别停留太久。',
      whispers: [
        { x: 760, y: 900, text: '颜色，被风吹去了远方。', size: 19 },
        { x: 1980, y: 742, text: '别急。一笔，一笔来。', size: 20 }
      ],
      solids: [
        { x: -200, y: 1000, w: 960, h: 450, kind: 'ground' },
        { x: 1080, y: 1000, w: 500, h: 450, kind: 'ground' },
        { x: 1480, y: 940, w: 140, h: 60, kind: 'step' },
        { x: 1580, y: 880, w: 310, h: 570, kind: 'ledge' },
        { x: 2220, y: 780, w: 700, h: 670, kind: 'ground' }
      ],
      oneways: [],
      spikes: [],
      mists: [],
      winds: [],
      pickups: [
        { x: 950, y: 848, kind: 'ink', amount: 30 },
        { x: 1720, y: 748, kind: 'ink', amount: 30 },
        { x: 2050, y: 660, kind: 'ink', amount: 30 }
      ],
      checkpoints: [{ x: 1320, y: 1000 }],
      goal: { x: 2480, y: 780 }
    },
    {
      id: 'cliff',
      no: '二',
      name: '断崖回廊',
      en: 'THE ECHOING CLIFFS',
      subtitle: '回声替你走路',
      theme: 'cliff',
      palette: PALETTES.cliff,
      bg: ['#f2ece2', '#ded9d0'],
      seed: 2207,
      bounds: { w: 1800, h: 2150 },
      spawn: { x: 240, y: 1864 },
      startInk: 100,
      strokeLife: 27,
      hint: '向上的路，有时要自己画出来。',
      subhint: '站定片刻，墨会慢慢回来。',
      whispers: [
        { x: 210, y: 1810, text: '这里曾有一架通天的梯子。', size: 19 },
        { x: 1400, y: 1450, text: '回声把你的脚步，画成另一条路。', size: 19 }
      ],
      solids: [
        { x: -150, y: 1880, w: 710, h: 280, kind: 'ground' },
        { x: 380, y: 1760, w: 320, h: 36, kind: 'ledge' },
        { x: 840, y: 1640, w: 320, h: 36, kind: 'ledge' },
        { x: 1260, y: 1520, w: 280, h: 36, kind: 'ledge' },
        { x: 780, y: 1380, w: 280, h: 36, kind: 'ledge' },
        { x: 420, y: 1260, w: 280, h: 36, kind: 'ledge' },
        { x: 980, y: 1120, w: 280, h: 36, kind: 'ledge' },
        { x: 1380, y: 1000, w: 420, h: 44, kind: 'ground' }
      ],
      oneways: [],
      spikes: [],
      mists: [],
      winds: [],
      pickups: [
        { x: 500, y: 1692, kind: 'ink', amount: 28 },
        { x: 960, y: 1552, kind: 'ink', amount: 28 },
        { x: 900, y: 1300, kind: 'ink', amount: 30 },
        { x: 1120, y: 1040, kind: 'ink', amount: 28 }
      ],
      checkpoints: [
        { x: 1390, y: 1520 },
        { x: 550, y: 1260 }
      ],
      goal: { x: 1580, y: 1000 }
    },
    {
      id: 'mist',
      no: '三',
      name: '雾之谷',
      en: 'THE FADING VALLEY',
      subtitle: '雾会吃掉墨，也会吃掉记忆',
      theme: 'mist',
      palette: PALETTES.mist,
      bg: ['#eef0ea', '#d9deda'],
      seed: 3313,
      bounds: { w: 3100, h: 1450 },
      spawn: { x: 220, y: 1024 },
      startInk: 100,
      strokeLife: 24,
      hint: '雾中的墨，褪得很快。找一找，雾里有没有光。',
      subhint: '色彩之种能驱散一小片雾。',
      whispers: [
        { x: 400, y: 975, text: '雾会吃掉墨，也会吃掉记忆。', size: 19 },
        { x: 2680, y: 860, text: '但你记得，颜色是什么样子。', size: 19 }
      ],
      solids: [
        { x: -150, y: 1040, w: 910, h: 410, kind: 'ground' },
        { x: 920, y: 960, w: 110, h: 30, kind: 'stone' },
        { x: 1160, y: 910, w: 120, h: 30, kind: 'stone' },
        { x: 1420, y: 960, w: 100, h: 30, kind: 'stone' },
        { x: 1880, y: 1040, w: 400, h: 410, kind: 'ledge' },
        { x: 2600, y: 920, w: 520, h: 530, kind: 'ground' }
      ],
      oneways: [],
      spikes: [],
      mists: [
        { x: 700, y: 500, w: 1400, h: 740, strength: 3.6 },
        { x: 2180, y: 520, w: 820, h: 800, strength: 3.6 }
      ],
      winds: [],
      pickups: [
        { x: 975, y: 872, kind: 'ink', amount: 30 },
        { x: 1220, y: 800, kind: 'seed', amount: 20, radius: 380 },
        { x: 2400, y: 930, kind: 'ink', amount: 35 }
      ],
      checkpoints: [{ x: 2060, y: 1040 }],
      goal: { x: 2840, y: 920 }
    },
    {
      id: 'tower',
      no: '四',
      name: '星屑高塔',
      en: 'THE WINDSWEPT TOWER',
      subtitle: '风从不记得方向',
      theme: 'tower',
      palette: PALETTES.tower,
      bg: ['#d7dbe3', '#bcc1c9'],
      seed: 4421,
      bounds: { w: 2000, h: 2400 },
      spawn: { x: 240, y: 2184 },
      startInk: 100,
      strokeLife: 25,
      hint: '风会把你推向悬崖。画一道墨墙，风便绕开你。',
      subhint: '靠近自己的墨迹时，风会安静下来。',
      whispers: [
        { x: 250, y: 2130, text: '塔顶的风，从不记得方向。', size: 19 },
        { x: 1600, y: 1270, text: '画一道墙。让风，绕开你。', size: 19 }
      ],
      solids: [
        { x: -150, y: 2200, w: 750, h: 280, kind: 'ground' },
        { x: 420, y: 2080, w: 260, h: 34, kind: 'ledge' },
        { x: 840, y: 1980, w: 260, h: 34, kind: 'ledge' },
        { x: 1240, y: 1880, w: 260, h: 34, kind: 'ledge' },
        { x: 900, y: 1770, w: 240, h: 34, kind: 'ledge' },
        { x: 500, y: 1660, w: 260, h: 34, kind: 'ledge' },
        { x: 850, y: 1550, w: 260, h: 34, kind: 'ledge' },
        { x: 1220, y: 1440, w: 260, h: 34, kind: 'ledge' },
        { x: 1520, y: 1330, w: 250, h: 34, kind: 'ledge' },
        { x: 1120, y: 1220, w: 280, h: 34, kind: 'ledge' },
        { x: 700, y: 1110, w: 280, h: 34, kind: 'ledge' },
        { x: 350, y: 1000, w: 280, h: 34, kind: 'ledge' },
        { x: 750, y: 890, w: 280, h: 34, kind: 'ledge' },
        { x: 1150, y: 780, w: 300, h: 34, kind: 'ledge' },
        { x: 1750, y: 680, w: 250, h: 44, kind: 'ground' }
      ],
      oneways: [],
      spikes: [],
      mists: [],
      winds: [
        { x: 600, y: 700, w: 1300, h: 1180, dir: 1, strength: 760 }
      ],
      pickups: [
        { x: 980, y: 1890, kind: 'ink', amount: 28 },
        { x: 620, y: 1720, kind: 'ink', amount: 28 },
        { x: 1300, y: 1390, kind: 'ink', amount: 28 },
        { x: 900, y: 1160, kind: 'ink', amount: 28 },
        { x: 500, y: 1050, kind: 'ink', amount: 28 }
      ],
      checkpoints: [
        { x: 1360, y: 1880 },
        { x: 1330, y: 1440 },
        { x: 480, y: 1000 }
      ],
      goal: { x: 1900, y: 680 }
    },
    {
      id: 'bloom',
      no: '五',
      name: '归色之庭',
      en: 'THE GARDEN OF COLOR',
      subtitle: '最后一页，留给你',
      theme: 'bloom',
      palette: PALETTES.bloom,
      bg: ['#f7efe1', '#e6dccb'],
      seed: 5555,
      bounds: { w: 3350, h: 1500 },
      spawn: { x: 230, y: 1064 },
      startInk: 100,
      strokeLife: 22,
      infiniteInk: true,
      hint: '最后一段路，墨没有尽头。画吧。',
      subhint: '让颜色，替你记得这一切。',
      whispers: [
        { x: 430, y: 1020, text: '最后一页，留给你。', size: 20 },
        { x: 1700, y: 820, text: '画吧。天空不会怪你。', size: 20 }
      ],
      solids: [
        { x: -200, y: 1080, w: 1000, h: 420, kind: 'ground' },
        { x: 1230, y: 960, w: 330, h: 44, kind: 'ledge' },
        { x: 1880, y: 860, w: 330, h: 44, kind: 'ledge' },
        { x: 2540, y: 760, w: 810, h: 740, kind: 'ground' }
      ],
      oneways: [],
      spikes: [],
      mists: [],
      winds: [],
      pickups: [
        { x: 1380, y: 880, kind: 'ink', amount: 0 },
        { x: 2020, y: 780, kind: 'ink', amount: 0 }
      ],
      checkpoints: [
        { x: 1390, y: 960 },
        { x: 2040, y: 860 }
      ],
      goal: { x: 2880, y: 760 }
    }
  ];

  // convenience: entity centre for goals and pickups
  levels.forEach((lv, i) => {
    lv.index = i;
    lv.goal.y0 = lv.goal.y;
    lv.pickups.forEach((p, j) => { p.id = `${lv.id}-p${j}`; p.taken = false; p.bob = j * 1.7; });
    lv.checkpoints.forEach((c, j) => { c.id = `${lv.id}-c${j}`; c.active = false; });
    lv.solids.forEach((s, j) => {
      s.id = `${lv.id}-s${j}`;
      // visual-only random seeds
      s.seed = (lv.seed + j * 97) % 1000;
    });
    lv.mists.forEach((m, j) => {
      m.id = `${lv.id}-m${j}`;
      m.clearings = [];
      m.cleared = 0;
    });
  });

  L.LEVELS = levels;
  L.PALETTES = PALETTES;
})();
