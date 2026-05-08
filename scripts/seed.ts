import { config as loadEnv } from "dotenv";
import { resolve } from "node:path";

/* Next.js reads .env.local; seed runs via tsx and must load the same file */
loadEnv({ path: resolve(process.cwd(), ".env") });
loadEnv({ path: resolve(process.cwd(), ".env.local"), override: true });

import bcrypt from "bcryptjs";
import mongoose from "mongoose";
import { Category } from "../models/Category";
import { MenuItem } from "../models/MenuItem";
import { User } from "../models/User";
import { Promotion } from "../models/Promotion";
import { SiteSetting } from "../models/SiteSetting";
import { Order } from "../models/Order";
import { slugify } from "../lib/slug";

const MONGODB_URI = process.env.MONGODB_URI;
if (!MONGODB_URI) {
  console.error("Set MONGODB_URI in .env.local before seeding.");
  process.exit(1);
}

type SeedOptionGroup = {
  groupKey: string;
  groupLabel: string;
  minSelect: number;
  maxSelect: number;
  isRequired: boolean;
  options: Array<{ key: string; label: string; priceModifier?: number; badge?: string }>;
};

const MOST_POPULAR_OPTION_GROUPS: SeedOptionGroup[] = [
  {
    groupKey: "choice-of-size",
    groupLabel: "Choice of Size",
    minSelect: 1,
    maxSelect: 1,
    isRequired: true,
    options: [
      { key: "size-small", label: "Small", priceModifier: 2.5 },
      { key: "size-regular", label: "Regular", priceModifier: 3.5, badge: "Popular" },
    ],
  },
  {
    groupKey: "base",
    groupLabel: "Base",
    minSelect: 1,
    maxSelect: 1,
    isRequired: true,
    options: [
      { key: "base-white-rice", label: "Poke Bowl (White Rice)", priceModifier: 0 },
      { key: "base-brown-rice", label: "Poke Bowl (Brown Rice)", priceModifier: 0 },
      { key: "base-mixed-greens", label: "Poke Bowl (Mixed Greens)", priceModifier: 0 },
      { key: "base-half-white-half-greens", label: "Poke Bowl (Half White Rice, Half Mixed Greens)", priceModifier: 0 },
      { key: "base-half-brown-half-greens", label: "Poke Bowl (Half Brown Rice, Half Mixed Greens)", priceModifier: 0 },
    ],
  },
  {
    groupKey: "extra-protein",
    groupLabel: "Extra Protein",
    minSelect: 0,
    maxSelect: 60,
    isRequired: false,
    options: [
      { key: "protein-salmon", label: "Salmon", priceModifier: 8.99, badge: "Popular" },
      { key: "protein-tuna", label: "Tuna", priceModifier: 8.99 },
      { key: "protein-white-meat-chicken", label: "White Meat Chicken", priceModifier: 6.5 },
      { key: "protein-steak", label: "Steak", priceModifier: 7.95 },
      { key: "protein-torched-salmon", label: "Torched Salmon", priceModifier: 8.99 },
      { key: "protein-torched-tuna", label: "Torched Tuna", priceModifier: 8.99 },
    ],
  },
  {
    groupKey: "extra-toppings",
    groupLabel: "Choose your extra toppings",
    minSelect: 0,
    maxSelect: 13,
    isRequired: false,
    options: [
      { key: "topping-beets", label: "Beets", priceModifier: 1.5 },
      { key: "topping-almonds", label: "Almonds", priceModifier: 1.5 },
      { key: "topping-cabbage", label: "Cabbage", priceModifier: 1.25 },
      { key: "topping-carrot", label: "Carrot", priceModifier: 1.25 },
      { key: "topping-corn", label: "Corn", priceModifier: 1.25 },
      { key: "topping-cucumber", label: "Cucumber", priceModifier: 1.25 },
      { key: "topping-edamame", label: "Edamame", priceModifier: 1.25 },
      { key: "topping-fried-wonton", label: "Fried Wonton", priceModifier: 1.25, badge: "Popular" },
      { key: "topping-furikake", label: "Furikake", priceModifier: 1.25 },
      { key: "topping-pickle-ginger", label: "Pickle Ginger", priceModifier: 1.25 },
      { key: "topping-pineapple", label: "Pineapple", priceModifier: 1.25 },
      { key: "topping-red-onion", label: "Red onion", priceModifier: 1.25 },
      { key: "topping-tangerine", label: "Tangerine", priceModifier: 1.25 },
      { key: "topping-mushroom", label: "Mushroom", priceModifier: 1.25 },
    ],
  },
  {
    groupKey: "extra-premium-toppings",
    groupLabel: "Choose your extra premium toppings",
    minSelect: 0,
    maxSelect: 60,
    isRequired: false,
    options: [
      { key: "premium-crabmeat-salad", label: "Crabmeat Salad", priceModifier: 2.5, badge: "Popular" },
      { key: "premium-seaweed-salad", label: "Seaweed Salad", priceModifier: 2.5 },
      { key: "premium-mango", label: "Mango", priceModifier: 2.5 },
      { key: "premium-mozzarella-cheese", label: "Mozzarella Cheese", priceModifier: 2.0 },
      { key: "premium-tamago", label: "Tamago", priceModifier: 2.0 },
      { key: "premium-avocado", label: "Avocado", priceModifier: 2.75 },
    ],
  },
  {
    groupKey: "extra-sauce-for-bowl",
    groupLabel: "Extra Sauce for bowl",
    minSelect: 0,
    maxSelect: 14,
    isRequired: false,
    options: [
      { key: "sauce-ponzu", label: "Ponzu", priceModifier: 0.99 },
      { key: "sauce-sesame-oil", label: "Sesame Oil", priceModifier: 0.99 },
      { key: "sauce-soy-sauce", label: "Soy Sauce", priceModifier: 0.99 },
      { key: "sauce-spicy-mango", label: "Spicy MANGO", priceModifier: 0.99 },
      { key: "sauce-sriracha-aioli", label: "Sriracha Aioli", priceModifier: 0.99 },
      { key: "sauce-togarashi", label: "Togarashi", priceModifier: 0.99 },
      { key: "sauce-truffle-mayo", label: "Truffle Mayo", priceModifier: 0.99 },
      { key: "sauce-unagi-tare", label: "Unagi Tare", priceModifier: 0.99 },
      { key: "sauce-wasabi-mayo", label: "Wasabi Mayo", priceModifier: 0.99 },
      { key: "sauce-gluten-free-soy", label: "Gluten-free Soy", priceModifier: 0.99 },
      { key: "sauce-black-sesame-tofu", label: "Black Sesame Tofu", priceModifier: 0.99 },
      { key: "sauce-spicy-mayo", label: "Spicy Mayo", priceModifier: 0.99, badge: "Popular" },
      { key: "sauce-sriracha-spicy-sauce", label: "Sriracha Spicy Sauce", priceModifier: 0.99 },
    ],
  },
  {
    groupKey: "frequently-bought-together",
    groupLabel: "Frequently bought together",
    minSelect: 0,
    maxSelect: 4,
    isRequired: false,
    options: [
      { key: "fbt-diet-coke", label: "Diet Coke", priceModifier: 2.0 },
      { key: "fbt-coca-cola", label: "Coca Cola", priceModifier: 1.5 },
      { key: "fbt-ginger-ale", label: "Ginger Ale", priceModifier: 2.0 },
      { key: "fbt-nestea", label: "Nestea", priceModifier: 2.0 },
    ],
  },
];

const BUILD_YOUR_OWN_OPTION_GROUPS: SeedOptionGroup[] = [
  {
    groupKey: "base",
    groupLabel: "Pick you base.",
    minSelect: 1,
    maxSelect: 1,
    isRequired: true,
    options: [
      { key: "byo-base-white-rice", label: "White Rice" },
      { key: "byo-base-brown-rice", label: "Brown Rice" },
      { key: "byo-base-mix-green", label: "Mix Green" },
      { key: "byo-base-half-white-half-greens", label: "Half White,Half Greens" },
      { key: "byo-base-half-brown-half-greens", label: "Half Brown, Half Greens" },
    ],
  },
  {
    groupKey: "protein",
    groupLabel: "Add you protein",
    minSelect: 0,
    maxSelect: 10,
    isRequired: false,
    options: [
      { key: "byo-protein-fresh-salmon", label: "Fresh Salmon", priceModifier: 8.99, badge: "Popular" },
      { key: "byo-protein-torched-salmon", label: "Torched Salmon", priceModifier: 8.99 },
      { key: "byo-protein-torched-tuna", label: "Torched Tuna", priceModifier: 8.99 },
      { key: "byo-protein-fresh-tuna", label: "Fresh Tuna", priceModifier: 8.99 },
      { key: "byo-protein-steak", label: "Steak", priceModifier: 7.95 },
      { key: "byo-protein-white-meat-chicken", label: "White Meat Chicken", priceModifier: 6.5 },
      { key: "byo-protein-smoked-tofu", label: "Smoked Tofu", priceModifier: 5.0 },
    ],
  },
  {
    groupKey: "free-topping",
    groupLabel: "Free topping",
    minSelect: 0,
    maxSelect: 4,
    isRequired: false,
    options: [
      { key: "byo-free-cabbage", label: "Cabbage" },
      { key: "byo-free-carrot", label: "Carrot" },
      { key: "byo-free-corn", label: "Corn" },
      { key: "byo-free-cucumber", label: "Cucumber" },
      { key: "byo-free-edamame", label: "Edamame" },
      { key: "byo-free-fried-wonton", label: "Fried Wonton", badge: "Popular" },
      { key: "byo-free-furikake", label: "Furikake" },
      { key: "byo-free-pineapple", label: "Pineapple" },
      { key: "byo-free-red-onion", label: "Red onion" },
      { key: "byo-free-yellow-radishi", label: "Yellow Radishi" },
      { key: "byo-free-tangerine", label: "Tangerine" },
      { key: "byo-free-dry-seaweed", label: "Dry Seaweed" },
      { key: "byo-free-mushroom", label: "Mushroom" },
      { key: "byo-free-pickle-ginger", label: "Pickle Ginger" },
    ],
  },
  {
    groupKey: "free-premium-topping",
    groupLabel: "Free premium topping",
    minSelect: 0,
    maxSelect: 1,
    isRequired: false,
    options: [
      { key: "byo-premium-avocado", label: "Avocado", priceModifier: 2.5, badge: "Popular" },
      { key: "byo-premium-crabmeat-salad", label: "Crabmeat Salad" },
      { key: "byo-premium-mango", label: "Mango" },
      { key: "byo-premium-seaweed-salad", label: "Seaweed Salad" },
    ],
  },
  {
    groupKey: "free-sauce-for-bowl",
    groupLabel: "Free Sauce for bowl (pick 2)",
    minSelect: 0,
    maxSelect: 2,
    isRequired: false,
    options: [
      { key: "byo-free-sauce-ponzu", label: "Ponzu" },
      { key: "byo-free-sauce-sesame-oil", label: "Sesame Oil" },
      { key: "byo-free-sauce-soy-sauce", label: "Soy Sauce" },
      { key: "byo-free-sauce-spicy-mango", label: "Spicy MANGO" },
      { key: "byo-free-sauce-sriracha-aioli", label: "Sriracha Aioli" },
      { key: "byo-free-sauce-togarashi", label: "Togarashi" },
      { key: "byo-free-sauce-truffle-mayo", label: "Truffle Mayo" },
      { key: "byo-free-sauce-unagi-tare", label: "Unagi Tare" },
      { key: "byo-free-sauce-wasabi-mayo", label: "Wasabi Mayo" },
      { key: "byo-free-sauce-gluten-free-soy", label: "Gluten-free Soy" },
      { key: "byo-free-sauce-black-sesame-tofu", label: "Black Sesame Tofu" },
      { key: "byo-free-sauce-spicy-mayo", label: "Spicy Mayo", badge: "Popular" },
    ],
  },
  {
    groupKey: "extra-toppings",
    groupLabel: "Choose your extra toppings",
    minSelect: 0,
    maxSelect: 13,
    isRequired: false,
    options: [
      { key: "topping-beets", label: "Beets", priceModifier: 1.5 },
      { key: "topping-almonds", label: "Almonds", priceModifier: 1.5 },
      { key: "topping-cabbage", label: "Cabbage", priceModifier: 1.25 },
      { key: "topping-carrot", label: "Carrot", priceModifier: 1.25 },
      { key: "topping-corn", label: "Corn", priceModifier: 1.25 },
      { key: "topping-cucumber", label: "Cucumber", priceModifier: 1.25 },
      { key: "topping-edamame", label: "Edamame", priceModifier: 1.25 },
      { key: "topping-fried-wonton", label: "Fried Wonton", priceModifier: 1.25, badge: "Popular" },
      { key: "topping-furikake", label: "Furikake", priceModifier: 1.25 },
      { key: "topping-pickle-ginger", label: "Pickle Ginger", priceModifier: 1.25 },
      { key: "topping-pineapple", label: "Pineapple", priceModifier: 1.25 },
      { key: "topping-red-onion", label: "Red onion", priceModifier: 1.25 },
      { key: "topping-tangerine", label: "Tangerine", priceModifier: 1.25 },
      { key: "topping-mushroom", label: "Mushroom", priceModifier: 1.25 },
    ],
  },
  {
    groupKey: "extra-premium-toppings",
    groupLabel: "Choose your extra premium toppings",
    minSelect: 0,
    maxSelect: 60,
    isRequired: false,
    options: [
      { key: "premium-crabmeat-salad", label: "Crabmeat Salad", priceModifier: 2.5, badge: "Popular" },
      { key: "premium-seaweed-salad", label: "Seaweed Salad", priceModifier: 2.5 },
      { key: "premium-mango", label: "Mango", priceModifier: 2.5 },
      { key: "premium-mozzarella-cheese", label: "Mozzarella Cheese", priceModifier: 2.0 },
      { key: "premium-tamago", label: "Tamago", priceModifier: 2.0 },
      { key: "premium-avocado", label: "Avocado", priceModifier: 2.75 },
    ],
  },
  {
    groupKey: "extra-sauce-for-bowl",
    groupLabel: "Extra Sauce for bowl",
    minSelect: 0,
    maxSelect: 14,
    isRequired: false,
    options: [
      { key: "sauce-ponzu", label: "Ponzu", priceModifier: 0.99 },
      { key: "sauce-sesame-oil", label: "Sesame Oil", priceModifier: 0.99 },
      { key: "sauce-soy-sauce", label: "Soy Sauce", priceModifier: 0.99 },
      { key: "sauce-spicy-mango", label: "Spicy MANGO", priceModifier: 0.99 },
      { key: "sauce-sriracha-aioli", label: "Sriracha Aioli", priceModifier: 0.99 },
      { key: "sauce-togarashi", label: "Togarashi", priceModifier: 0.99 },
      { key: "sauce-truffle-mayo", label: "Truffle Mayo", priceModifier: 0.99 },
      { key: "sauce-unagi-tare", label: "Unagi Tare", priceModifier: 0.99 },
      { key: "sauce-wasabi-mayo", label: "Wasabi Mayo", priceModifier: 0.99 },
      { key: "sauce-gluten-free-soy", label: "Gluten-free Soy", priceModifier: 0.99 },
      { key: "sauce-black-sesame-tofu", label: "Black Sesame Tofu", priceModifier: 0.99 },
      { key: "sauce-spicy-mayo", label: "Spicy Mayo", priceModifier: 0.99, badge: "Popular" },
      { key: "sauce-sriracha-spicy-sauce", label: "Sriracha Spicy Sauce", priceModifier: 0.99 },
    ],
  },
  {
    groupKey: "frequently-bought-together",
    groupLabel: "Frequently bought together",
    minSelect: 0,
    maxSelect: 4,
    isRequired: false,
    options: [
      { key: "fbt-diet-coke", label: "Diet Coke", priceModifier: 2.0 },
      { key: "fbt-coca-cola", label: "Coca Cola", priceModifier: 1.5 },
      { key: "fbt-ginger-ale", label: "Ginger Ale", priceModifier: 2.0 },
      { key: "fbt-nestea", label: "Nestea", priceModifier: 2.0 },
    ],
  },
];

function flattenMenuOptions(groups: SeedOptionGroup[]) {
  let order = 0;
  return groups.flatMap((group) =>
    group.options.map((opt) => ({
      key: opt.key,
      label: opt.label,
      priceModifier: opt.priceModifier ?? 0,
      badge: opt.badge ?? "",
      groupKey: group.groupKey,
      groupLabel: group.groupLabel,
      minSelect: group.minSelect,
      maxSelect: group.maxSelect,
      isRequired: group.isRequired,
      sortOrder: order++,
    }))
  );
}

const DRINKS = [
  { key: "coca-cola", name: "Coca Cola", price: 1.5 },
  { key: "nestea", name: "Nestea", price: 2.0 },
  { key: "diet-coke", name: "Diet Coke", price: 2.0 },
  { key: "ginger-ale", name: "Ginger Ale", price: 2.0 },
];

function drinkPopupOptions(currentDrinkKey: string) {
  const options = DRINKS.filter((d) => d.key !== currentDrinkKey).map((d) => ({
    key: `drink-fbt-${d.key}`,
    label: d.name,
    priceModifier: d.price,
  }));
  return flattenMenuOptions([
    {
      groupKey: "frequently-bought-together",
      groupLabel: "Frequently bought together",
      minSelect: 0,
      maxSelect: 3,
      isRequired: false,
      options,
    },
  ]);
}

async function main() {
  await mongoose.connect(MONGODB_URI!);
  console.log("Connected. Resetting collections used by the app...");

  await Promise.all([
    Category.deleteMany({}),
    MenuItem.deleteMany({}),
    User.deleteMany({ email: { $in: ["admin@onopokebar.com", "demo@onopokebar.com"] } }),
    Promotion.deleteMany({}),
    SiteSetting.deleteMany({}),
    Order.deleteMany({}),
  ]);

  const categories = await Category.insertMany([
    { name: "Most Popular", slug: "most-popular", description: "Guest favourites", sortOrder: 1, isActive: true },
    { name: "'Ono Signatures", slug: "ono-signatures", description: "House-crafted combinations", sortOrder: 2, isActive: true },
    { name: "Build Your Own", slug: "build-your-own", description: "Compose your perfect bowl", sortOrder: 3, isActive: true },
    { name: "Drinks", slug: "drinks", description: "Refreshments", sortOrder: 4, isActive: true },
  ]);

  const bySlug = Object.fromEntries(categories.map((c) => [c.slug, c._id])) as Record<string, mongoose.Types.ObjectId>;

  const mostPopularOptions = flattenMenuOptions(MOST_POPULAR_OPTION_GROUPS);
  const buildYourOwnOptions = flattenMenuOptions(BUILD_YOUR_OWN_OPTION_GROUPS);

  const items = [
    // Most Popular
    {
      name: "Spicy Salmon Seaweed Bowl",
      slug: "spicy-salmon-seaweed-bowl",
      description:
        "Fresh salmon, seaweed salad, masago, red cabbage, corn, edamame, carrot, sesame seeds, fried wonton, spicy mayo.",
      price: 25.95,
      category: bySlug["most-popular"],
      image: "/images/menu/spicy-salmon-seaweed-bowl.jpg",
      badges: ["Most Popular"],
      isFeatured: false,
      isPopular: true,
      isSpicy: true,
      isVegetarian: false,
      options: mostPopularOptions,
    },
    {
      name: "Big Island (One Size)",
      slug: "big-island-one-size",
      description: "Salmon, tuna, avocado, carrot, corn, edamame, pineapple, fried wonton, spicy mayo, sesame.",
      price: 21.45,
      category: bySlug["most-popular"],
      image: "/images/menu/big-island-one-size.jpg",
      badges: ["Most Popular"],
      isFeatured: false,
      isPopular: true,
      isSpicy: false,
      isVegetarian: false,
      options: mostPopularOptions,
    },
    {
      name: "'Ono Torched Salmon",
      slug: "ono-torched-salmon",
      description:
        "Torched salmon, masago, tamago, avocado, carrot, corn, edamame, green onion, fried wonton, furikake, wasabi mayonnaise sauce.",
      price: 18.45,
      category: bySlug["most-popular"],
      image: "/images/menu/ono-torched-salmon.jpg",
      badges: ["Most Popular"],
      isFeatured: false,
      isPopular: true,
      isSpicy: false,
      isVegetarian: false,
      options: mostPopularOptions,
    },
    {
      name: "'Ono Torched Ahi Tuna",
      slug: "ono-torched-ahi-tuna",
      description:
        "Torched ahi tuna, avocado, carrot, edamame, green onion, pineapple, red cabbage, fried wonton, furikake, sriracha aioli sauce.",
      price: 18.45,
      category: bySlug["most-popular"],
      image: "/images/menu/ono-torched-ahi-tuna.jpg",
      badges: ["Most Popular"],
      isPopular: true,
      isSpicy: false,
      isVegetarian: false,
      options: mostPopularOptions,
    },
    {
      name: "Classic Salmon",
      slug: "classic-salmon",
      description:
        "Salmon, masago, tamago, avocado, cucumber, edamame, tangerine, fried wonton, furikake, wasabi mayonnaise sauce.",
      price: 17.95,
      category: bySlug["most-popular"],
      image: "/images/menu/classic-salmon.jpg",
      badges: ["Most Popular"],
      isFeatured: false,
      isPopular: true,
      isSpicy: false,
      isVegetarian: false,
      options: mostPopularOptions,
    },
    {
      name: "Spicy Mango Salmon",
      slug: "spicy-mango-salmon",
      description: "Salmon, mango, masago, tamago, corn, cucumber, edamame, fried wonton, furikake, spicy mango sauce.",
      price: 17.95,
      category: bySlug["most-popular"],
      image: "/images/menu/spicy-mango-salmon.jpg",
      badges: ["Most Popular", "Spicy"],
      isFeatured: false,
      isPopular: true,
      isSpicy: true,
      isVegetarian: false,
      options: mostPopularOptions,
    },
    {
      name: "Spicy Tuna Bowl",
      slug: "spicy-tuna-bowl",
      description:
        "Fresh tuna, seaweed salad, red cabbage, corn, edamame, carrot, sesame seeds, fried wonton, spicy mayo.",
      price: 24.95,
      category: bySlug["most-popular"],
      image: "/images/menu/spicy-tuna-bowl.jpg",
      badges: ["Most Popular", "Spicy"],
      isPopular: true,
      isSpicy: true,
      isVegetarian: false,
      options: mostPopularOptions,
    },
    {
      name: "Chicken & Crabmeat Bowl",
      slug: "chicken-and-crabmeat-bowl",
      description:
        "White meat chicken, crabmeat, carrots, cucumbers, red cabbage, tomatoes, fried wonton, teriyaki sauce.",
      price: 24.95,
      category: bySlug["most-popular"],
      image: "/images/menu/chicken-and-crabmeat-bowl.jpg",
      badges: ["Most Popular"],
      isFeatured: false,
      isPopular: true,
      isSpicy: false,
      isVegetarian: false,
      options: mostPopularOptions,
    },

    // 'Ono Signatures (only items not already in Most Popular)
    {
      name: "Ahi Tuna Bowl",
      slug: "ahi-tuna-bowl",
      description: "Ahi tuna, avocado, corn, cucumber, yellow radish, red cabbage, fried wonton, furikake, unagi tare sauce.",
      price: 18.95,
      category: bySlug["ono-signatures"],
      image: "/images/menu/ahi-tuna-bowl.jpg",
      badges: ["Signature"],
      isFeatured: false,
      isPopular: true,
      isSpicy: false,
      isVegetarian: false,
      options: mostPopularOptions,
    },
    {
      name: "Chicken & Avocado",
      slug: "chicken-and-avocado",
      description:
        "Grilled chicken breast, avocado, tomato, cucumber, carrots, red cabbage, fried wonton, furikake, unagi tare.",
      price: 16.25,
      category: bySlug["ono-signatures"],
      image: "/images/menu/chicken-and-avocado.jpg",
      badges: ["Signature"],
      isPopular: true,
      isSpicy: false,
      isVegetarian: false,
      options: mostPopularOptions,
    },
    {
      name: "Kabayaki Unagi",
      slug: "kabayaki-unagi",
      description: "Carrot, cucumber, cabbage, crabmeat salad, tomato, fried wonton, kabayaki unagi, unagi tare.",
      price: 19.75,
      category: bySlug["ono-signatures"],
      image: "/images/menu/kabayaki-unagi.jpg",
      badges: ["Signature"],
      isFeatured: false,
      isPopular: false,
      isSpicy: false,
      isVegetarian: false,
      options: mostPopularOptions,
    },
    {
      name: "Saikoro Steak",
      slug: "saikoro-steak",
      description: "Premium steak poké bowl with fresh vegetables and house sauce.",
      price: 15.99,
      category: bySlug["ono-signatures"],
      image: "/images/menu/saikoro-steak.jpg",
      badges: ["Signature"],
      isFeatured: false,
      isPopular: false,
      isSpicy: false,
      isVegetarian: false,
      options: mostPopularOptions,
    },
    {
      name: "Smoked Tofu",
      slug: "smoked-tofu",
      description: "Vegetarian smoked tofu bowl with fresh vegetables and sauce.",
      price: 15.95,
      category: bySlug["ono-signatures"],
      image: "/images/menu/smoked-tofu.jpg",
      badges: ["Signature"],
      isPopular: false,
      isSpicy: false,
      isVegetarian: true,
      options: mostPopularOptions,
    },
    {
      name: "Tofu & Seaweed Bowl",
      slug: "tofu-and-seaweed-bowl",
      description: "Smoked tofu, seaweed salad, cucumber, edamame, corn, red cabbage, furikake and sauce.",
      price: 23.95,
      category: bySlug["ono-signatures"],
      image: "/images/menu/tofu-and-seaweed-bowl.jpg",
      badges: ["Signature", "Vegetarian"],
      isPopular: false,
      isSpicy: false,
      isVegetarian: true,
      options: mostPopularOptions,
    },

    // Build Your Own
    {
      name: "Build Your Own Bowl (Small)",
      slug: "build-your-own-bowl-small",
      description: "Pick you base.",
      price: 13.99,
      category: bySlug["build-your-own"],
      image: "",
      badges: ["Build Your Own"],
      isFeatured: false,
      isPopular: true,
      isSpicy: false,
      isVegetarian: false,
      options: buildYourOwnOptions,
    },
    {
      name: "Build Your Own Bowl (Regular)",
      slug: "build-your-own-bowl-regular",
      description: "Pick you base. (You can choose up to 2)",
      price: 15.99,
      category: bySlug["build-your-own"],
      image: "",
      badges: ["Build Your Own"],
      isFeatured: false,
      isPopular: true,
      isSpicy: false,
      isVegetarian: false,
      options: buildYourOwnOptions,
    },

    // Drinks
    {
      name: "Coca Cola",
      slug: "coca-cola",
      description: "Classic Coca Cola.",
      price: 1.5,
      category: bySlug["drinks"],
      image: "/images/drinks/coca-cola.jpg",
      badges: ["Drink"],
      isFeatured: false,
      isPopular: true,
      isSpicy: false,
      isVegetarian: true,
      options: drinkPopupOptions("coca-cola"),
    },
    {
      name: "Nestea",
      slug: "nestea",
      description: "Refreshing Nestea.",
      price: 2.0,
      category: bySlug["drinks"],
      image: "/images/drinks/nestea.jpg",
      badges: ["Drink"],
      isFeatured: false,
      isPopular: true,
      isSpicy: false,
      isVegetarian: true,
      options: drinkPopupOptions("nestea"),
    },
    {
      name: "Diet Coke",
      slug: "diet-coke",
      description: "Diet Coke.",
      price: 2.0,
      category: bySlug["drinks"],
      image: "/images/drinks/diet-coke.jpg",
      badges: ["Drink"],
      isFeatured: false,
      isPopular: true,
      isSpicy: false,
      isVegetarian: true,
      options: drinkPopupOptions("diet-coke"),
    },
    {
      name: "Ginger Ale",
      slug: "ginger-ale",
      description: "Crisp Ginger Ale.",
      price: 2.0,
      category: bySlug["drinks"],
      image: "/images/drinks/ginger-ale.jpg",
      badges: ["Drink"],
      isFeatured: false,
      isPopular: true,
      isSpicy: false,
      isVegetarian: true,
      options: drinkPopupOptions("ginger-ale"),
    },
  ];

  await MenuItem.insertMany(
    items.map((it) => ({
      ...it,
      slug: it.slug || slugify(it.name),
      ingredients: it.description.split(",").map((s) => s.trim()).filter(Boolean),
      isAvailable: true,
      options: it.options ?? [],
    }))
  );

  const adminHash = await bcrypt.hash("Admin123!ChangeMe", 12);
  const demoHash = await bcrypt.hash("Demo123!", 12);

  await User.insertMany([
    {
      name: "ONO Admin",
      email: "admin@onopokebar.com",
      passwordHash: adminHash,
      phone: "(416) 000-0000",
      role: "admin",
      isBlocked: false,
    },
    {
      name: "Demo Guest",
      email: "demo@onopokebar.com",
      passwordHash: demoHash,
      phone: "(416) 000-0001",
      role: "user",
      isBlocked: false,
    },
  ]);

  await Promotion.insertMany([
    {
      code: "WELCOME10",
      type: "percentage",
      value: 10,
      expiryDate: new Date(Date.now() + 1000 * 60 * 60 * 24 * 90),
      usageLimit: 500,
      usedCount: 0,
      isActive: true,
    },
    {
      code: "ONO5",
      type: "fixed",
      value: 5,
      expiryDate: new Date(Date.now() + 1000 * 60 * 60 * 24 * 60),
      usageLimit: 200,
      usedCount: 0,
      isActive: true,
    },
  ]);

  await SiteSetting.create({
    restaurantName: "ONO Poké Bar",
    address: "100 Western Battery Rd #2, Toronto, ON M6K 3S2",
    phone: "(416) 000-0000",
    email: "hello@onopokebar.com",
    openingHours: "Mon–Sun · 11:00 AM – 9:00 PM (update in admin before launch)",
    socialLinks: { instagram: "", facebook: "", tiktok: "" },
    logo: "/images/logo.png",
    heroImages: [
      "/images/menu/spicy-salmon-seaweed-bowl.jpg",
      "/images/menu/classic-salmon.jpg",
      "/images/menu/spicy-tuna-bowl.jpg",
    ],
  });

  const demoUser = await User.findOne({ email: "demo@onopokebar.com" });
  const classic = await MenuItem.findOne({ slug: "classic-salmon" });

  if (demoUser && classic) {
    await Order.create({
      orderNumber: "ONO-SEED1",
      userId: demoUser._id,
      customerName: "Demo Guest",
      customerEmail: "demo@onopokebar.com",
      customerPhone: "(416) 000-0001",
      orderType: "pickup",
      servingMode: "in_store_pickup",
      deliveryAddress: null,
      items: [
        {
          menuItemId: classic._id,
          name: classic.name,
          price: classic.price,
          quantity: 2,
          selectedOptions: {},
          notes: "",
          image: classic.image,
        },
      ],
      subtotal: classic.price * 2,
      tax: 0,
      deliveryFee: 0,
      discount: 0,
      total: classic.price * 2,
      promoCode: "",
      paymentStatus: "paid",
      orderStatus: "completed",
      stripePaymentIntentId: "pi_seed_placeholder",
      stripeCheckoutSessionId: "cs_seed_placeholder",
      notes: "Sample completed order from seed script",
    });

    await Order.create({
      orderNumber: "ONO-SEED2",
      userId: demoUser._id,
      customerName: "Demo Guest",
      customerEmail: "demo@onopokebar.com",
      customerPhone: "(416) 000-0001",
      orderType: "pickup",
      servingMode: "in_store_pickup",
      deliveryAddress: null,
      items: [
        {
          menuItemId: classic._id,
          name: classic.name,
          price: classic.price,
          quantity: 1,
          selectedOptions: {},
          notes: "Extra spicy mayo",
          image: classic.image,
        },
      ],
      subtotal: classic.price,
      tax: 2.33,
      deliveryFee: 0,
      discount: 0,
      total: classic.price + 2.33,
      promoCode: "",
      paymentStatus: "unpaid",
      orderStatus: "pending",
      notes: "Sample pending pickup order",
    });
  }

  console.log("Seed complete.");
  console.log("Admin login: admin@onopokebar.com / Admin123!ChangeMe");
  console.log("Demo user: demo@onopokebar.com / Demo123!");
  await mongoose.disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
