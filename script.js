/* =========================================================
   ZETA — КОММЕРЧЕСКОЕ ПРЕДЛОЖЕНИЕ
   script.js
========================================================= */


/* =========================================================
   НАСТРОЙКИ
========================================================= */

const S = 'zeta_kp_draft';

const PDF_FONTS = {
  normal: 'fonts/DejaVuSans.ttf',
  bold: 'fonts/DejaVuSans-Bold.ttf'
};

const ZETA_LOGO = 'assets/zeta-logo.png';

const QR_IMAGE = 'assets/qr-vizitka.png';

let pdfFontPromise = null;

const $ = id => document.getElementById(id);

const rows = $('rows');


/* =========================================================
   ЗАГРУЗКА КИРИЛЛИЧЕСКИХ ШРИФТОВ
========================================================= */

async function ensureCyrillicFont(doc) {

  if (!pdfFontPromise) {

    pdfFontPromise = (async () => {

      async function loadFont(path, name, style) {

        const response = await fetch(path);

        if (!response.ok) {
          throw new Error(
            'Не удалось загрузить шрифт: ' + path
          );
        }

        const buffer =
          await response.arrayBuffer();

        const bytes =
          new Uint8Array(buffer);

        let binary = '';

        const chunkSize = 0x8000;

        for (
          let i = 0;
          i < bytes.length;
          i += chunkSize
        ) {

          binary += String.fromCharCode(
            ...bytes.subarray(
              i,
              i + chunkSize
            )
          );
        }

        return {
          fileName: name + '.ttf',
          fontName: name,
          style: style,
          data: btoa(binary)
        };
      }


      return Promise.all([

        loadFont(
          PDF_FONTS.normal,
          'DejaVuSans',
          'normal'
        ),

        loadFont(
          PDF_FONTS.bold,
          'DejaVuSans',
          'bold'
        )

      ]);

    })();

  }


  const fonts =
    await pdfFontPromise;


  fonts.forEach(font => {

    doc.addFileToVFS(
      font.fileName,
      font.data
    );

    doc.addFont(
      font.fileName,
      font.fontName,
      font.style
    );

  });


  doc.setFont(
    'DejaVuSans',
    'normal'
  );

}


/* =========================================================
   ЗАГРУЗКА ИЗОБРАЖЕНИЙ
========================================================= */

async function loadImageData(url) {

  const response =
    await fetch(url);


  if (!response.ok) {

    throw new Error(
      'Не удалось загрузить изображение: ' +
      url
    );

  }


  const blob =
    await response.blob();


  return new Promise(
    (resolve, reject) => {

      const reader =
        new FileReader();


      reader.onload =
        () => resolve(
          reader.result
        );


      reader.onerror =
        reject;


      reader.readAsDataURL(
        blob
      );

    }
  );

}


/* =========================================================
   ФОРМАТИРОВАНИЕ ЧИСЕЛ
========================================================= */

const fmt = n =>

  new Intl.NumberFormat(
    'ru-RU',
    {
      maximumFractionDigits: 2
    }
  ).format(
    Number(n || 0)
  );


const money = n =>

  fmt(n) + ' ₸';


const esc = s =>

  String(s || '').replace(
    /[&<>"']/g,
    c => ({
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#039;'
    }[c])
  );


/* =========================================================
   ГЕНЕРАЦИЯ НОМЕРА КП
========================================================= */

function num() {

  const d =
    new Date();


  return (

    String(
      d.getFullYear()
    ).slice(2)

    +

    String(
      d.getMonth() + 1
    ).padStart(
      2,
      '0'
    )

    +

    String(
      d.getDate()
    ).padStart(
      2,
      '0'
    )

    +

    '-'

    +

    (
      100 +
      Math.floor(
        Math.random() * 900
      )
    )

  );

}


/* =========================================================
   ДОБАВЛЕНИЕ ТОВАРА
========================================================= */

function add(p = {}) {

  const r =
    document.createElement(
      'div'
    );


  r.className =
    'row';


  r.innerHTML = `

    <span class="n"></span>

    <input
      class="name"
      placeholder="Наименование позиции"
      value="${esc(p.name)}"
    >

    <input
      class="qty"
      type="number"
      min="0"
      step="0.01"
      value="${p.qty ?? 1}"
    >

    <input
      class="unit"
      value="${esc(
        p.unit || 'шт'
      )}"
    >

    <input
      class="price"
      type="number"
      min="0"
      step="0.01"
      value="${p.price ?? ''}"
      placeholder="0"
    >

    <span class="sum">
      0 ₸
    </span>

    <button
      class="del"
      type="button"
    >
      ×
    </button>

  `;


  r.querySelectorAll(
    'input'
  ).forEach(
    input => {

      input.oninput =
        change;

    }
  );


  r.querySelector(
    '.del'
  ).onclick =
    () => {

      if (
        rows.children.length > 1
      ) {

        r.remove();

      } else {

        r.querySelector(
          '.name'
        ).value = '';

        r.querySelector(
          '.price'
        ).value = '';

      }


      change();

    };


  rows.append(
    r
  );

}


/* =========================================================
   ПОЛУЧЕНИЕ ПОЗИЦИЙ
========================================================= */

function products() {

  return [

    ...rows.children

  ].map(
    r => ({

      name:
        r.querySelector(
          '.name'
        ).value.trim(),

      qty:
        +r.querySelector(
          '.qty'
        ).value || 0,

      unit:
        r.querySelector(
          '.unit'
        ).value.trim() ||
        'шт',

      price:
        +r.querySelector(
          '.price'
        ).value || 0

    })
  );

}


/* =========================================================
   ОБЩАЯ СУММА
========================================================= */

function total() {

  return products().reduce(

    (sum, p) =>

      sum +
      (
        p.qty *
        p.price
      ),

    0

  );

}


/* =========================================================
   СУММА ПРОПИСЬЮ
========================================================= */

const one = [

  'ноль',
  'один',
  'два',
  'три',
  'четыре',
  'пять',
  'шесть',
  'семь',
  'восемь',
  'девять'

];


const teen = [

  'десять',
  'одиннадцать',
  'двенадцать',
  'тринадцать',
  'четырнадцать',
  'пятнадцать',
  'шестнадцать',
  'семнадцать',
  'восемнадцать',
  'девятнадцать'

];


const ten = [

  '',
  '',
  'двадцать',
  'тридцать',
  'сорок',
  'пятьдесят',
  'шестьдесят',
  'семьдесят',
  'восемьдесят',
  'девяносто'

];


const hund = [

  '',
  'сто',
  'двести',
  'триста',
  'четыреста',
  'пятьсот',
  'шестьсот',
  'семьсот',
  'восемьсот',
  'девятьсот'

];


function plural(n, forms) {

  n =
    Math.abs(n) % 100;


  const x =
    n % 10;


  if (
    n > 10 &&
    n < 20
  ) {

    return forms[2];

  }


  if (
    x > 1 &&
    x < 5
  ) {

    return forms[1];

  }


  if (x === 1) {

    return forms[0];

  }


  return forms[2];

}


function tri(
  n,
  female = false
) {

  const result = [];


  if (n >= 100) {

    result.push(

      hund[
        Math.floor(
          n / 100
        )
      ]

    );

  }


  n %= 100;


  if (
    n >= 10 &&
    n < 20
  ) {

    result.push(
      teen[n - 10]
    );

    return result.join(
      ' '
    );

  }


  if (n >= 20) {

    result.push(

      ten[
        Math.floor(
          n / 10
        )
      ]

    );

  }


  n %= 10;


  if (n) {

    if (
      female &&
      n === 1
    ) {

      result.push(
        'одна'
      );

    }

    else if (
      female &&
      n === 2
    ) {

      result.push(
        'две'
      );

    }

    else {

      result.push(
        one[n]
      );

    }

  }


  return result.join(
    ' '
  );

}


function words(n) {

  n =
    Math.floor(
      Math.abs(n || 0)
    );


  if (!n) {

    return (
      'Ноль тенге 00 тиын'
    );

  }


  const groups = [

    null,

    [
      'тысяча',
      'тысячи',
      'тысяч'
    ],

    [
      'миллион',
      'миллиона',
      'миллионов'
    ],

    [
      'миллиард',
      'миллиарда',
      'миллиардов'
    ]

  ];


  const parts = [];

  let i = 0;


  while (n) {

    const current =
      n % 1000;


    if (current) {

      let text =
        tri(
          current,
          i === 1
        );


      if (i) {

        text +=

          ' ' +

          plural(
            current,
            groups[i]
          );

      }


      parts.unshift(
        text
      );

    }


    n =
      Math.floor(
        n / 1000
      );


    i++;

  }


  let result =
    parts.join(
      ' '
    );


  result =

    result[0].toUpperCase() +

    result.slice(1);


  return (

    result +

    ' тенге 00 тиын'

  );

}


/* =========================================================
   СБОР ДАННЫХ
========================================================= */

function data() {

  return {

    num:
      $('num').value,

    date:
      $('date').value,

    client:
      $('client').value,

    intro:
      $('intro').value,

    note:
      $('note').value,

    products:
      products()

  };

}


/* =========================================================
   СОХРАНЕНИЕ
========================================================= */

function save(showMessage = false) {

  localStorage.setItem(

    S,

    JSON.stringify(
      data()
    )

  );


  if (showMessage) {

    toast(
      'Черновик сохранён'
    );

  }

}


/* =========================================================
   ЗАГРУЗКА
========================================================= */

function load() {

  let saved =
    localStorage.getItem(
      S
    );


  if (saved) {

    try {

      saved =
        JSON.parse(
          saved
        );


      $('num').value =
        saved.num;


      $('date').value =
        saved.date;


      $('client').value =
        saved.client;


      $('intro').value =
        saved.intro;


      $('note').value =
        saved.note;


      (
        saved.products ||
        [{}]
      ).forEach(
        add
      );


      return;

    }

    catch (error) {

      console.error(
        error
      );

    }

  }


  $('num').value =
    num();


  $('date').value =
    new Date()
      .toISOString()
      .slice(
        0,
        10
      );


  add();

}


/* =========================================================
   ИЗМЕНЕНИЕ
========================================================= */

function change() {

  [
    ...rows.children
  ].forEach(

    (r, index) => {

      const p =
        products()[index];


      r.querySelector(
        '.n'
      ).textContent =
        index + 1;


      r.querySelector(
        '.sum'
      ).textContent =

        money(
          p.qty *
          p.price
        );

    }

  );


  preview();

  save();

}


/* =========================================================
   ПРЕДПРОСМОТР
========================================================= */

function preview() {

  $('pNum').textContent =

    '№ ' +

    (
      $('num').value ||
      '—'
    );


  const d =
    $('date').value;


  $('pDate').textContent =

    d

      ? d
          .split('-')
          .reverse()
          .join('.')

      : '—';


  $('pClient').textContent =
    $('client').value;


  $('forWrap').style.display =

    $('client').value

      ? 'block'

      : 'none';


  $('pIntro').textContent =

    $('intro').value ||

    'Компания ТОО «ДЖАМИЛЯ» предлагает Вам ознакомиться с предложением по следующим позициям:';


  const table =
    $('pRows');


  table.innerHTML =
    '';


  const ps =
    products().filter(

      p =>
        p.name ||
        p.price

    );


  const items =

    ps.length

      ? ps

      : [

          {
            name:
              'Позиция не добавлена',

            qty:
              0,

            unit:
              '—',

            price:
              0
          }

        ];


  items.forEach(

    (p, index) => {

      table.innerHTML += `

        <tr>

          <td>
            ${index + 1}
          </td>

          <td>
            ${esc(p.name)}
          </td>

          <td>
            ${fmt(p.qty)}
          </td>

          <td>
            ${esc(p.unit)}
          </td>

          <td>
            ${money(p.price)}
          </td>

          <td>
            ${money(
              p.qty *
              p.price
            )}
          </td>

        </tr>

      `;

    }

  );


  $('pTotal').textContent =
    money(
      total()
    );


  $('pWords').textContent =
    words(
      total()
    );


  $('pNote').textContent =
    $('note').value;


  $('pNote').style.display =

    $('note').value

      ? 'block'

      : 'none';


  scale();

}


/* =========================================================
   МАСШТАБ
========================================================= */

function scale() {

  if (
    innerWidth <= 760
  ) {

    return;

  }


  const box =
    document.querySelector(
      '.previewBox'
    );


  const paper =
    $('paper');


  const scaleValue =

    Math.min(

      1,

      (
        box.clientWidth -
        32
      ) / 794

    );


  paper.style.transform =

    'scale(' +

    scaleValue +

    ')';


  box.style.height =

    (

      1123 *
      scaleValue +

      32

    ) +

    'px';

}


/* =========================================================
   УВЕДОМЛЕНИЯ
========================================================= */

function toast(text) {

  const element =
    $('toast');


  element.textContent =
    text;


  element.classList.add(
    'show'
  );


  clearTimeout(
    window.tt
  );


  window.tt =

    setTimeout(

      () =>

        element.classList.remove(
          'show'
        ),

      2200

    );

}


/* =========================================================
   ОЧИСТКА
========================================================= */

function clearAll() {

  if (

    !confirm(
      'Очистить все данные?'
    )

  ) {

    return;

  }


  localStorage.removeItem(
    S
  );


  rows.innerHTML =
    '';


  $('num').value =
    num();


  $('date').value =

    new Date()
      .toISOString()
      .slice(
        0,
        10
      );


  $('client').value =
    '';


  $('intro').value =
    '';


  $('note').value =
    '';


  add();

  change();

}


function newKP() {

  if (

    confirm(
      'Создать новое КП?'
    )

  ) {

    clearAll();

  }

}


/* =========================================================
   ГЕНЕРАЦИЯ PDF
========================================================= */

async function pdf() {

  if (
    !window.jspdf
  ) {

    toast(
      'PDF-модуль не загрузился.'
    );

    return;

  }


  const d =
    data();


  const {
    jsPDF
  } =
    window.jspdf;


  const doc =
    new jsPDF({

      unit:
        'mm',

      format:
        'a4'

    });


  const W =
    210;

  const H =
    297;

  const m =
    15;


  /* =======================================================
     ШРИФТ
  ======================================================= */

  try {

    await ensureCyrillicFont(
      doc
    );

  }

  catch (error) {

    console.error(
      error
    );


    toast(
      'Не удалось загрузить кириллический шрифт.'
    );


    return;

  }


  /* =======================================================
     ЛОГОТИП И QR
  ======================================================= */

  let logoImage;

  let qrImage;


  try {

    logoImage =
      await loadImageData(
        ZETA_LOGO
      );


    qrImage =
      await loadImageData(
        QR_IMAGE
      );

  }

  catch (error) {

    console.error(
      error
    );


    toast(
      'Не удалось загрузить логотип или QR-код.'
    );


    return;

  }


  /* =======================================================
     ФОН
  ======================================================= */

  doc.setFillColor(
    247,
    243,
    234
  );


  doc.rect(
    0,
    0,
    W,
    H,
    'F'
  );


  /* =======================================================
     ШАПКА
  ======================================================= */

  doc.setFillColor(
    30,
    32,
    28
  );


  doc.rect(
    0,
    0,
    W,
    42,
    'F'
  );


  /* =======================================================
     ЛОГОТИП ZETA
  ======================================================= */

  doc.addImage(

    logoImage,

    'PNG',

    15,

    7,

    70,

    29

  );


  /* =======================================================
     НОМЕР И ДАТА
  ======================================================= */

  doc.setTextColor(
    244,
    240,
    233
  );


  doc.setFont(
    'DejaVuSans',
    'normal'
  );


  doc.setFontSize(
    8.5
  );


  doc.text(

    'КОММЕРЧЕСКОЕ ПРЕДЛОЖЕНИЕ',

    W - m,

    14,

    {
      align:
        'right'
    }

  );


  doc.setFont(
    'DejaVuSans',
    'bold'
  );


  doc.setFontSize(
    13
  );


  doc.text(

    '№ ' +

    (
      d.num ||
      '—'
    ),

    W - m,

    22,

    {
      align:
        'right'
    }

  );


  doc.setFont(
    'DejaVuSans',
    'normal'
  );


  doc.setFontSize(
    9
  );


  doc.text(

    d.date

      ? d.date
          .split('-')
          .reverse()
          .join('.')

      : '—',

    W - m,

    29,

    {
      align:
        'right'
    }

  );


  /* =======================================================
     ПОСТАВЩИК
  ======================================================= */

  let y =
    53;


  doc.setTextColor(
    90,
    88,
    82
  );


  doc.setFontSize(
    8
  );


  doc.text(
    'ПОСТАВЩИК',
    m,
    y
  );


  doc.setTextColor(
    30,
    30,
    27
  );


  doc.setFont(
    'DejaVuSans',
    'bold'
  );


  doc.setFontSize(
    10
  );


  doc.text(
    'ТОО «ДЖАМИЛЯ»',
    m,
    y + 6
  );


  doc.setFont(
    'DejaVuSans',
    'normal'
  );


  doc.setTextColor(
    100,
    97,
    90
  );


  doc.setFontSize(
    8.2
  );


  doc.text(

    doc.splitTextToSize(

      'Республика Казахстан, 010014, Акмолинская область, Аршалынский район, с. Жибек Жолы, ул. Бирлик, строение 55/1',

      80

    ),

    m,

    y + 12

  );


  /* =======================================================
     КЛИЕНТ
  ======================================================= */

  if (d.client) {

    doc.setTextColor(
      90,
      88,
      82
    );


    doc.setFontSize(
      8
    );


    doc.text(

      'ПОДГОТОВЛЕНО ДЛЯ',

      W - m,

      y,

      {
        align:
          'right'
      }

    );


    doc.setTextColor(
      30,
      30,
      27
    );


    doc.setFont(
      'DejaVuSans',
      'bold'
    );


    doc.setFontSize(
      11
    );


    doc.text(

      d.client,

      W - m,

      y + 7,

      {
        align:
          'right'
      }

    );

  }


  /* =======================================================
     ВСТУПЛЕНИЕ
  ======================================================= */

  y =
    82;


  doc.setDrawColor(
    190,
    185,
    175
  );


  doc.line(

    m,

    y - 4,

    W - m,

    y - 4

  );


  doc.setTextColor(
    40,
    40,
    37
  );


  doc.setFont(
    'DejaVuSans',
    'normal'
  );


  doc.setFontSize(
    9.5
  );


  const intro =

    d.intro ||

    'Компания ТОО «ДЖАМИЛЯ» предлагает Вам ознакомиться с предложением по следующим позициям:';


  const lines =

    doc.splitTextToSize(

      intro,

      W - m * 2

    );


  doc.text(
    lines,
    m,
    y
  );


  y +=

    lines.length *
    4 +

    7;


  /* =======================================================
     ТАБЛИЦА
  ======================================================= */

  const ps =

    d.products.filter(

      p =>
        p.name ||
        p.price

    );


  const body =

    (

      ps.length

        ? ps

        : [

            {
              name:
                'Позиция не добавлена',

              qty:
                0,

              unit:
                '—',

              price:
                0
            }

          ]

    ).map(

      (p, index) => [

        index + 1,

        p.name,

        fmt(
          p.qty
        ),

        p.unit,

        fmt(
          p.price
        ),

        fmt(
          p.qty *
          p.price
        )

      ]

    );


  doc.autoTable({

    startY:
      y,


    head: [[

      '№',

      'Наименование',

      'Кол-во',

      'Ед.',

      'Цена, ₸',

      'Сумма, ₸'

    ]],


    body:
      body,


    margin: {

      left:
        m,

      right:
        m

    },


    /* КИРИЛЛИЦА В ТЕЛЕ ТАБЛИЦЫ */

    styles: {

      font:
        'DejaVuSans',

      fontStyle:
        'normal',

      fontSize:
        8.4,

      cellPadding:
        2.8,

      lineColor: [
        220,
        215,
        205
      ],

      lineWidth:
        0.1

    },


    /* КИРИЛЛИЦА В ЗАГОЛОВКЕ */

    headStyles: {

      font:
        'DejaVuSans',

      fontStyle:
        'bold',

      fontSize:
        8.4,

      fillColor: [
        31,
        33,
        29
      ],

      textColor: [
        247,
        243,
        234
      ]

    },


    bodyStyles: {

      font:
        'DejaVuSans',

      fontStyle:
        'normal',

      fontSize:
        8.4

    },


    columnStyles: {

      0: {

        halign:
          'center',

        cellWidth:
          9

      },


      1: {

        cellWidth:
          78

      },


      2: {

        halign:
          'center',

        cellWidth:
          17

      },


      3: {

        halign:
          'center',

        cellWidth:
          14

      },


      4: {

        halign:
          'right',

        cellWidth:
          29

      },


      5: {

        halign:
          'right',

        cellWidth:
          29

      }

    }

  });


  /* =======================================================
     ИТОГОВАЯ СУММА
  ======================================================= */

  let a =

    doc.lastAutoTable.finalY +

    8;


  const t =
    total();


  doc.setFillColor(
    31,
    33,
    29
  );


  doc.roundedRect(

    m,

    a,

    W - m * 2,

    17,

    1.5,

    1.5,

    'F'

  );


  doc.setTextColor(
    247,
    243,
    234
  );


  doc.setFont(
    'DejaVuSans',
    'bold'
  );


  doc.setFontSize(
    9
  );


  doc.text(

    'ОБЩАЯ СУММА',

    m + 5,

    a + 7

  );


  doc.setFontSize(
    14
  );


  doc.text(

    money(t),

    W - m - 5,

    a + 8,

    {
      align:
        'right'
    }

  );


  a +=
    24;


  doc.setTextColor(
    100,
    97,
    90
  );


  doc.setFont(
    'DejaVuSans',
    'normal'
  );


  doc.setFontSize(
    8.7
  );


  doc.text(

    doc.splitTextToSize(

      words(t),

      W - m * 2

    ),

    m,

    a

  );


  /* =======================================================
     ПРИМЕЧАНИЕ
  ======================================================= */

  if (d.note) {

    a +=
      13;


    doc.setDrawColor(
      182,
      154,
      104
    );


    doc.setLineWidth(
      0.8
    );


    doc.line(

      m,

      a - 3,

      m,

      a + 8

    );


    doc.setTextColor(
      85,
      82,
      76
    );


    doc.setFont(
      'DejaVuSans',
      'normal'
    );


    doc.setFontSize(
      8
    );


    doc.text(

      doc.splitTextToSize(

        d.note,

        W - m * 2 - 5

      ),

      m + 4,

      a

    );

  }


  /* =======================================================
     НИЖНИЙ БЛОК
  ======================================================= */

  const fy =
    262;


  doc.setDrawColor(
    210,
    205,
    195
  );


  doc.setLineWidth(
    0.2
  );


  doc.line(

    m,

    fy - 5,

    W - m,

    fy - 5

  );


  /* =======================================================
     ПОДПИСЬ
  ======================================================= */

  doc.setTextColor(
    40,
    40,
    36
  );


  doc.setFont(
    'DejaVuSans',
    'normal'
  );


  doc.setFontSize(
    9
  );


  doc.text(

    'С уважением,',

    m,

    fy + 2

  );


  doc.setFont(
    'DejaVuSans',
    'bold'
  );


  doc.setFontSize(
    11
  );


  doc.text(

    'Нурмухамед Нурсултан',

    m,

    fy + 9

  );


  doc.setFont(
    'DejaVuSans',
    'normal'
  );


  doc.setTextColor(
    105,
    101,
    94
  );


  doc.setFontSize(
    7
  );


  doc.text(

    'Торговый представитель ZETA',

    m,

    fy + 14

  );


  /* =======================================================
     QR-КОД
  ======================================================= */

  const qrSize =
    26;


  const qrX =

    W -

    m -

    qrSize;


  const qrY =
    fy - 8;


  doc.addImage(

    qrImage,

    'PNG',

    qrX,

    qrY,

    qrSize,

    qrSize

  );


  /* =======================================================
     ПОДПИСЬ QR
  ======================================================= */

  doc.setFont(
    'DejaVuSans',
    'normal'
  );


  doc.setTextColor(
    90,
    87,
    80
  );


  doc.setFontSize(
    5.8
  );





  /* =======================================================
     РАЗДЕЛИТЕЛЬ
  ======================================================= */

  doc.setDrawColor(
    190,
    185,
    175
  );


  doc.setLineWidth(
    0.3
  );


  doc.line(

    qrX - 10,

    fy - 4,

    qrX - 10,

    fy + 16

  );


  /* =======================================================
     КОНТАКТ
  ======================================================= */

  doc.setTextColor(
    65,
    62,
    57
  );


  doc.setFont(
    'DejaVuSans',
    'bold'
  );


  doc.setFontSize(
    9
  );


  doc.text(

    '+7 702 763 5159',

    qrX - 14,

    fy + 5,

    {
      align:
        'right'
    }

  );


  doc.setFont(
    'DejaVuSans',
    'normal'
  );


  doc.setTextColor(
    105,
    101,
    94
  );


  doc.setFontSize(
    7
  );


  doc.text(

    'Телефон / WhatsApp',

    qrX - 14,

    fy + 11,

    {
      align:
        'right'
    }

  );


  /* =======================================================
     НИЖНЯЯ ПОДПИСЬ
  ======================================================= */

  doc.setTextColor(
    145,
    140,
    130
  );


  doc.setFontSize(
    6
  );


  doc.text(

    'ZETA · КАЧЕСТВО В КАЖДОЙ ДЕТАЛИ',

    W / 2,

    H - 10,

    {
      align:
        'center'
    }

  );


  /* =======================================================
     СОХРАНЕНИЕ
  ======================================================= */

  doc.save(

    'КП_' +

    (
      d.num ||
      'ZETA'
    )

    +

    '.pdf'

  );


  toast(
    'PDF успешно сформирован'
  );

}


/* =========================================================
   КНОПКИ
========================================================= */

$('add').onclick =
  () => {

    add();

    change();

  };


$('addBottom').onclick =
  () => {

    add();

    change();

  };


$('saveBtn').onclick =
  () => {

    $('saveBottom').click();

  };


$('saveBottom').onclick =
  () => {

    save(true);

  };


$('clearBtn').onclick =
  clearAll;


$('newBtn').onclick =
  newKP;


$('pdf').onclick =
  pdf;


$('pdfSide').onclick =
  pdf;


$('mobilePdf').onclick =
  pdf;


$('refresh').onclick =
  preview;


/* =========================================================
   ПОЛЯ ФОРМЫ
========================================================= */

[
  'num',
  'date',
  'client',
  'intro',
  'note'
].forEach(

  id => {

    $(id).oninput =
      change;

  }

);


/* =========================================================
   АДАПТАЦИЯ
========================================================= */

window.onresize =
  scale;


/* =========================================================
   ЗАПУСК
========================================================= */

load();

preview();
