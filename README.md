## How it works

- Original Shopify theme is downloaded to `.theme` directory
- JS & CSS bundles are created from `src` with `vite-shopify` plugin
- Modified theme is saved in `dist` directory and synced with a dev theme using `shopify-cli`

### Final theme composition

Final theme is a result of merging following directories (each directory overwrites files from previous directories):

- `/.theme`
- `/overrides`
- `/src/modules/*/theme`

Finally vite bundles are added to the `assets` directory and `juo-tag.liquid` snippet is created to mount bundles in other `liquid` files.

### Where should I put a file

- If you are overwriting an existing theme file then put it to `overrides` directory
- If you are adding a new file then put it to `theme` directory in appropriate module

## Initialize repo

Clone `theme-skeleton` repository and install dependencies
https://github.com/juo/theme-skeleton

1. Rename `theme.code-workspace` to match the store name
2. Update store url in package.json `config.store`

### Initialize selected module

Copy selected module from `modules` directory to `src/modules`.

### Initialize theme

Pull existing theme from Shopify

```bash
pnpm run theme:pull
```

### Optional: Add cloudflare tunnel

Add `VITE_SHOPIFY_TUNNEL` environment variable to the `.env`. Match pattern provided in `.env.example`.

## Development commands

In order to start work with shopify theme two commands should be executed in following order:

1. `pnpm run dev:shopify` - Starts shopify auth process and online theme-sync
2. `pnpm run dev:vite` - Starts local development server

## Build & Publishing

1. Make sure development commands are not running in the background
2. Check eslint errors: `pnpm run lint` and make approperiate fixes
3. Run `pnpm run build` to build your changes
4. Publish with `pnpm run push` and select target theme

## Examples

### Modify product section

Copy product section from `.theme` directory to `overrides/sections`.

In the selected section add the widget schema to the `blocks` array.

Inside the product `from` render the widget with following snippet within the `blocks` loop:

```liquid
{%- case block.type -%}
  {%- when 'juo-custom-widget' -%}
    {%- render 'juo-widget', block: block, product: product %}
{%- endcase -%}
```

Remember to pass required parameters along if the product form is located in a separate snippet liquid file. Reload `pnpm dev` process to apply changes to the remote development theme.

### Customize widget block

Enter the shopify admin panel and pick selected product template. Inside the selected section add the widget block to the template. If possible adjust widget style as needed and execute `pnpm dev:pull` to get existing widget configuration to the local machine. Then copy downloaded template file to the `overrides/templates`. Reload `pnpm dev` process to apply changes to the remote development theme.

### Link to the Customer Portal

Copy following `customer` templates from `.theme` to `overrides/templates/customers`:

- login
- register
- account

### Add link code

Add following snippet and adjust where needed:

```liquid
{% liquid
  assign base_url = routes.root_url
  assign last_char = base_url | slice: -1

  if last_char != '/'
    assign base_url = base_url | append: '/'
  endif
%}
<a href="{{ base_url }}apps/juo">
  {{- 'customer.login.subscription_link' | t -}}
</a>
```

Notice that translation object property refers to current page object as sample code refers to the `login` page.

### Add language support

Copy `locales/en.default.json` to `overrides/locales`.
Find existing translation key matching the designated page object.
Add translations for the `subscription_link` and `subscription_label` as needed.
