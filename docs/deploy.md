# Деплой

Сайт: https://aiglossary.ineshost.net — Fornex shared-хостинг (cPanel, Apache), перед ним Cloudflare.

Кожен push у `main` → workflow [Check](../.github/workflows/check.yml): перевірки й збірка, і лише якщо все зелене — job `deploy` заливає `site/dist/` через `rsync` по SSH. Налаштування як у `vitugan/evakuatorzhytomyr`. Вручну: Actions → Check → Run workflow.

## Одноразове налаштування

1. **cPanel → Domains:** подивіться корінь документів (document root) для `aiglossary.ineshost.net` — шлях відносно домашньої теки, напр. `public_html/aiglossary.ineshost.net/`.
2. **Секрети репо** (Settings → Secrets and variables → Actions → Secrets) — ті самі значення, що в evakuatorzhytomyr, якщо це той самий акаунт cPanel:
   - `SSH_HOST`, `SSH_USER`, `SSH_PRIVATE_KEY`, `SSH_KNOWN_HOSTS` (`ssh-keyscan -p 20022 <host>`).
3. **Змінні репо** (вкладка Variables):
   - `DEPLOY_PATH` — шлях із п. 1, обов'язково власна тека сайту (workflow відмовиться деплоїти в порожній шлях чи просто `public_html/`, бо `--delete` стер би інші сайти);
   - `SSH_PORT` — лише якщо не 20022.

З терміналу (значення вводяться інтерактивно, ключ — з файлу):

```bash
gh secret set SSH_HOST --repo vitugan/ai-coding-glossary
gh secret set SSH_USER --repo vitugan/ai-coding-glossary
gh secret set SSH_PRIVATE_KEY --repo vitugan/ai-coding-glossary < ~/.ssh/<deploy-key>
gh secret set SSH_KNOWN_HOSTS --repo vitugan/ai-coding-glossary
gh variable set DEPLOY_PATH --repo vitugan/ai-coding-glossary --body "public_html/aiglossary.ineshost.net/"
```

## Що робить сервер

[site/public/.htaccess](../site/public/.htaccess):

- `/` → `/uk/` або `/en/`: спершу мова, яку читач уже обирав (cookie `lang`, ставить сам сайт), далі українська, якщо її приймає браузер, далі англійська для будь-якої іншої мови браузера, інакше українська;
- 404 → `/404.html`;
- `/_astro/*` кешується назавжди (імена з хешем), решта — 5 хвилин.

HTTPS забезпечує Cloudflare; редиректу http→https у `.htaccess` навмисно немає.
