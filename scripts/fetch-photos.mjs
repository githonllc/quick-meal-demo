// Downloads the chosen stock photos into public/img/<kind>.webp (800x600 cover crop, WebP q70).
// Run once: node scripts/fetch-photos.mjs
import { mkdir, writeFile } from 'node:fs/promises'

const PHOTOS = [
  {
    "kind": "bowl",
    "url": "https://images.unsplash.com/photo-1579619002916-88cd4c81a70c",
    "author": "James Frewin",
    "sourcePage": "https://unsplash.com/photos/pasta-with-meat-on-white-ceramic-plate-CzD0EHabuzE",
    "license": "Unsplash License"
  },
  {
    "kind": "noodles",
    "url": "https://images.unsplash.com/photo-1553621043-f607bfbf6640",
    "author": "Riccardo Bergamini",
    "sourcePage": "https://unsplash.com/photos/pasta-on-plate-Xe14NrSK9io",
    "license": "Unsplash License"
  },
  {
    "kind": "dumplings",
    "url": "https://images.unsplash.com/photo-1496116218417-1a781b1c416c",
    "author": "charlesdeluvio",
    "sourcePage": "https://unsplash.com/photos/three-white-dimsum-on-brown-bowl-D-vDQMTfAAU",
    "license": "Unsplash License"
  },
  {
    "kind": "soup",
    "url": "https://images.unsplash.com/photo-1629978444632-9f63ba0eff47",
    "author": "Julia Kicova",
    "sourcePage": "https://unsplash.com/photos/brown-soup-on-white-and-blue-ceramic-bowl-Qct8v6wdyRs",
    "license": "Unsplash License"
  },
  {
    "kind": "taco",
    "url": "https://images.unsplash.com/photo-1599974579688-8dbdd335c77f",
    "author": "Jeswin Thomas",
    "sourcePage": "https://unsplash.com/photos/beef-tacos-with-onion-and-cilantro-z_PfaGzeN9E",
    "license": "Unsplash License"
  },
  {
    "kind": "burrito",
    "url": "https://images.unsplash.com/photo-1600315958029-b922dee42ac2",
    "author": "Frank Alarcon",
    "sourcePage": "https://unsplash.com/photos/brown-bread-on-white-ceramic-plate-Oya1Kx9311k",
    "license": "Unsplash License"
  },
  {
    "kind": "burger",
    "url": "https://images.unsplash.com/photo-1568901346375-23c9450c58cd",
    "author": "amirali mirhashemian",
    "sourcePage": "https://unsplash.com/photos/burger-with-lettuce-and-tomatoes-sc5sTPMrVfk",
    "license": "Unsplash License"
  },
  {
    "kind": "fries",
    "url": "https://images.unsplash.com/photo-1676566399758-51b0d3927d48",
    "author": "ABHISHEK HAJARE",
    "sourcePage": "https://unsplash.com/photos/a-basket-filled-with-french-fries-next-to-a-bowl-of-ketchup-QHE-BP6QcOE",
    "license": "Unsplash License"
  },
  {
    "kind": "pizza",
    "q": 55,
    "url": "https://images.unsplash.com/photo-1574071318508-1cdbab80d002",
    "author": "Aurélien Lemasson-Théobald",
    "sourcePage": "https://unsplash.com/photos/round-cooked-pizza-x00CzBt4Dfk",
    "license": "Unsplash License"
  },
  {
    "kind": "salad",
    "q": 45,
    "url": "https://images.unsplash.com/photo-1646487793655-bbf280273d2f",
    "author": "irws",
    "sourcePage": "https://unsplash.com/photos/a-salad-in-a-wooden-bowl-on-a-table-emxFTjEvpKQ",
    "license": "Unsplash License"
  },
  {
    "kind": "sushi",
    "q": 55,
    "url": "https://images.unsplash.com/photo-1579871494447-9811cf80d66c",
    "author": "Vinicius Benedit",
    "sourcePage": "https://unsplash.com/photos/salmon-sushi-rolls-on-plate--1GEAA8q3wk",
    "license": "Unsplash License"
  },
  {
    "kind": "curry",
    "url": "https://images.unsplash.com/photo-1627366422957-3efa9c6df0fc",
    "author": "Yubraj Timsina",
    "sourcePage": "https://unsplash.com/photos/soup-with-meat-in-white-ceramic-bowl-eI_Uk6uGCOQ",
    "license": "Unsplash License"
  },
  {
    "kind": "sandwich",
    "url": "https://images.unsplash.com/photo-1553909489-cd47e0907980",
    "author": "Mae Mu",
    "sourcePage": "https://unsplash.com/photos/sandwich-on-white-surface-IZ0LRt1khgM",
    "license": "Unsplash License"
  },
  {
    "kind": "chicken",
    "url": "https://images.unsplash.com/photo-1569058242253-92a9c755a0ec",
    "author": "Kevin kevin",
    "sourcePage": "https://unsplash.com/photos/food-lot-on-a-green-leaf-plate-nwmZhwOSVnM",
    "license": "Unsplash License"
  },
  {
    "kind": "poke",
    "url": "https://images.unsplash.com/photo-1604259597308-5321e8e4789c",
    "author": "Miu Sua",
    "sourcePage": "https://unsplash.com/photos/sliced-cucumber-and-sliced-lemon-on-white-ceramic-bowl-pO9851jklaE",
    "license": "Unsplash License"
  },
  {
    "kind": "rice",
    "url": "https://images.unsplash.com/photo-1664717698774-84f62382613b",
    "author": "herry shani",
    "sourcePage": "https://unsplash.com/photos/a-bowl-of-rice-with-vegetables-MVMohJBieo4",
    "license": "Unsplash License"
  }
]

const OUT_DIR = new URL('../public/img/', import.meta.url)
// Default quality 70; a photo may set a lower q to stay under 120 KB.
const PARAMS = 'w=800&h=600&fit=crop&fm=webp'

await mkdir(OUT_DIR, { recursive: true })
for (const p of PHOTOS) {
  const res = await fetch(`${p.url}?${PARAMS}&q=${p.q ?? 70}`)
  if (!res.ok) throw new Error(`${p.kind}: HTTP ${res.status}`)
  const buf = Buffer.from(await res.arrayBuffer())
  await writeFile(new URL(`${p.kind}.webp`, OUT_DIR), buf)
  console.log(p.kind, Math.round(buf.length / 1024) + ' KB')
}
