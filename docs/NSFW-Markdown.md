# Mature content blocks in markdown

The mature content filter of the chapter reader now also works inside any markdown page
(wiki, character pages, etc). The very same filter key used by the fic
(`storyCfg.nsfw` in [`src/chapters/config.mjs`](../src/chapters/config.mjs)) drives the markdown blocks.

## Syntax

```md
:::nsfw vore
Content shown only while the `vore` filter is enabled.
:::nsfw !vore
Content shown only while the `vore` filter is disabled.
:::nsfw default
Fallback content, shown when no other branch matches.
:::
```

- A block starts with `:::nsfw <expression>` and ends on the first line that only holds `:::`.
- Every `:::nsfw <expression>` line starts a new branch of the same block.
- Only the **first** matching branch is rendered.
- When no branch matches, the whole block stays hidden.

## Expressions

| Expression | Meaning |
| --- | --- |
| `vore` | The `vore` filter is enabled. |
| `!vore` | The `vore` filter is disabled. |
| `vore, !questionable` | Every token must match. |
| `default` or `*` | Always matches. Use it as a fallback. |

## Behavior

- The block uses the exact same storage as the chapter reader (`localStorage` under the
  `NSFW<filter>` key), so enabling a filter in the fic also enables it on the wiki.
- The age/region gate (`isNoNsfw()`) still applies: while the reader has not passed the
  verification, every filter is treated as disabled.
- Changing a filter updates the blocks immediately, without a page reload.
- Pages that use `:::nsfw` automatically get the **Choose Optional Mature Content** button at the top.

## Full example

```md
# Character

:::nsfw extreme_violence
The battle was brutal: the blade went straight through the armor.
:::nsfw default
The battle was intense, but nobody got seriously hurt.
:::
```
