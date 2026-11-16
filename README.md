# Mistborn Digital Edition

An annotated digital edition of the opening of *Mistborn: The Final Empire* by Brandon Sanderson, encoded in [TEI XML](https://tei-c.org/).

**Live site:** https://williamlmorrison.github.io/Claude-project/

## What's here

| File | Purpose |
| --- | --- |
| `Mistborn.xml` | The TEI-encoded text: numbered paragraphs, notes, tagged names, titles, places, and organizations, and links to the Coppermind wiki. |
| `index.html` | The edition page. |
| `assets/edition.js` | Loads `Mistborn.xml` in the browser and turns the TEI markup into the reading view. |
| `assets/style.css` | Page styles, including dark mode and mobile layout. |

## Features

- Footnotes you can click to read in place, plus a full list at the end
- Highlights for names, titles, places, and organizations that you can switch on and off
- An index of tagged terms that jumps to each place a term appears
- A link for every paragraph (for example `#p-26`)
- A list of all the external links in the text

## Editing the text

Edit `Mistborn.xml` and push to `main`. The site reads the XML directly, so no build step is needed. To preview locally, run a small web server, because browsers won't load the XML from a `file://` page:

```sh
python3 -m http.server
# then open http://localhost:8000
```

## Encoding conventions

- `<p n="N">`: paragraph number N
- `<persName>`: a person's name (`<rs type="person">` when the person is referred to without a name)
- `<roleName>`: a title or rank, such as "Lord" or "obligator"
- `<placeName>`: a place
- `<orgName>`: an organization
- `key="…"` on any of these: groups different forms of a term in the index (for example `key="obligator"` on "obligators")
- `<note place="bottom">`: editorial note
- `<ref target="URL">`: external link

## Copyright

The text is © Brandon Sanderson (Tor Books) and is used as a short excerpt for a class assignment. The encoding and annotations are by William Morrison.
