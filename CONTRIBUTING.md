# Як долучитися · Contributing

**[Українська](#українська) · [English](#english)**

## Українська

### Як влаштовано вміст

```
content/
├── structure.yaml          # розділи і порядок термінів (лише ID)
├── en/                     # Основна мова — кожен термін мусить бути тут
│   ├── language.yaml       # назва мови, назви розділів
│   ├── intro.md            # вступ на головній сторінці
│   └── terms/<id>.md       # терміни
└── uk/
    ├── language.yaml
    ├── intro.md
    ├── equivalents.yaml    # Відповідники EN → UK і Заборонені форми
    └── terms/<id>.md
```

- **ID терміна** — ім'я файлу англійським kebab-case (`context-window.md`), однакове в усіх мовах.
- **EN — Основна мова.** Термін без EN-версії не пройде перевірку; Переклади робляться з EN. Якщо Перекладу немає, сайт показує EN-текст.

### Файл терміна

```markdown
---
title: Контекстне вікно
description: Усе, що модель бачить під час кожного запиту…
aliases: # необов'язково
  - вікно контексту
---

Основний текст. Посилання на інший термін: [модель](./model.md).

## avoid

«пам'ять» — контекстне вікно це робочий стан, а не пам'ять.

## usage

«Чи можу я просто вставити весь монорепо в промпт?»

«Контекстне вікно має 200 тисяч токенів…»
```

- `## avoid` (необов'язково) і `## usage` (обов'язково) — це **маркери**, їх пишуть саме так, англійською й малими літерами, в будь-якій мові. Підписи «Уникайте» / «Приклад» сайт підставляє сам. Інших заголовків у терміні немає.
- У `## usage` кожен абзац — окрема репліка діалогу.
- Посилання на терміни — лише відносні, в межах своєї мови: `./model.md`.

### Типові задачі

- **Виправити помилку.** Відредагуйте файл — на сайті для цього є посилання «Редагувати цю сторінку».
- **Перекласти термін.** Скопіюйте `content/en/terms/<id>.md` у `content/<мова>/terms/<id>.md` і перекладіть `title`, `description` і текст. Маркери й ID лишаються як є.
- **Додати новий термін.** Створіть `content/en/terms/<id>.md` (обов'язково) і, за бажанням, Переклади; додайте ID у потрібний розділ `content/structure.yaml`.
- **Додати нову мову.** Створіть `content/<код>/language.yaml` (`code`, `name`, назви всіх розділів) і перекладайте терміни поступово — неперекладені сайт покаже англійською.

### Термінологія (українська)

`content/uk/equivalents.yaml` фіксує Відповідники: як перекладається кожне поняття і яких варіантів уникати.

```yaml
harness:
  uk: Оболонка
  avoid: [харнес]
```

Перевірка блокує Заборонені форми в будь-якому відмінку, а `title` терміна має збігатися з його Відповідником. Хочете запропонувати інший переклад — змініть Відповідник у PR і поясніть чому.

### Перевірки

Кожен PR перевіряється автоматично. Локально:

```bash
pnpm install
pnpm lint:content   # помилки у вмісті — з файлом, рядком і підказкою
pnpm coverage       # що ще не перекладено
```

Після `pnpm install` ті самі перевірки запускаються перед кожним комітом. Найчастіші помилки: латинська літера-двійник у кириличному слові («хаpнес» з латинською `p`), посилання на неіснуючий термін, заголовок замість маркера.

## English

### How the content is organised

See the tree above. Every term lives in `content/<lang>/terms/<id>.md`, where `<id>` is the English kebab-case file name, the same in every language. **English is the source language**: every term must exist in `content/en/`, translations are made from English, and the site falls back to English where a translation is missing.

### A term file

Frontmatter has `title`, `description` and optional `aliases`. The body may contain exactly two markers, written in English and lowercase in every language: `## avoid` (optional) and `## usage` (required). The site renders localized labels for them. Each paragraph under `## usage` is one line of dialogue. Link to other terms with relative links within the same language: `./model.md`.

### Common tasks

- **Fix a mistake** — edit the file (the site has an "Edit this page" link).
- **Translate a term** — copy `content/en/terms/<id>.md` to `content/<lang>/terms/<id>.md` and translate `title`, `description` and the text, keeping markers and the ID.
- **Add a term** — create `content/en/terms/<id>.md` (required), optionally translations, and add the ID to a section in `content/structure.yaml`.
- **Add a language** — create `content/<code>/language.yaml` with `code`, `name` and all section titles, then translate terms at your own pace.

### Checks

Every PR is checked automatically. Run `pnpm install`, then `pnpm lint:content` and `pnpm coverage` locally; the same checks run before each commit.
