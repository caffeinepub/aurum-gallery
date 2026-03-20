import type { Moment } from "../backend.d";

export const SAMPLE_MOMENTS: Moment[] = [
  {
    id: BigInt(1),
    title: "first time we drove nowhere",
    caption:
      "windows down, no destination, playlist on shuffle. you fell asleep thirty minutes in and i didn't wake you. just kept driving.",
    date: "2023-04-08",
    imageId: "https://picsum.photos/seed/drive01/800/600",
    order: BigInt(1),
    createdAt: BigInt(0),
    uploadedBy: "bhaskar",
  },
  {
    id: BigInt(2),
    title: "that corner café",
    caption:
      "you ordered the wrong thing and liked it more than what you wanted. we sat there three hours. the waiter stopped refilling our water.",
    date: "2023-06-21",
    imageId: "https://picsum.photos/seed/cafe02/600/800",
    order: BigInt(2),
    createdAt: BigInt(0),
    uploadedBy: "mihika",
  },
  {
    id: BigInt(3),
    title: "golden hour on the roof",
    caption:
      "we thought it would be awkward. it wasn't. you brought snacks nobody asked for and it was the best decision of the evening.",
    date: "2023-08-14",
    imageId: "https://picsum.photos/seed/roof03/900/600",
    order: BigInt(3),
    createdAt: BigInt(0),
    uploadedBy: "bhaskar",
  },
  {
    id: BigInt(4),
    title: "the bookstore afternoon",
    caption:
      "four hours. you read three chapters standing up and refused to buy the book. i bought it anyway. you finished it in two days.",
    date: "2023-10-02",
    imageId: "https://picsum.photos/seed/books04/700/900",
    order: BigInt(4),
    createdAt: BigInt(0),
    uploadedBy: "mihika",
  },
  {
    id: BigInt(5),
    title: "rain on the window",
    caption:
      "power went out. we lit every candle in the apartment. you said it looked like a séance. it kind of did.",
    date: "2023-12-19",
    imageId: "https://picsum.photos/seed/rain05/800/500",
    order: BigInt(5),
    createdAt: BigInt(0),
    uploadedBy: "bhaskar",
  },
  {
    id: BigInt(6),
    title: "the laughing fit at 2am",
    caption:
      "neither of us remembers what was funny. doesn't matter. my face hurt for two days after.",
    date: "2024-02-03",
    imageId: "https://picsum.photos/seed/laugh06/600/600",
    order: BigInt(6),
    createdAt: BigInt(0),
    uploadedBy: "mihika",
  },
];
