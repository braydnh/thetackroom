export interface SubItem {
  label: string;
  value: string;
}

export interface SubGroup {
  label: string;
  value: string;
  items: SubItem[];
}

export interface CategoryConfig {
  value: string;
  label: string;
  groups: SubGroup[];
}

export const CATEGORIES: CategoryConfig[] = [
  {
    value: "horse",
    label: "Horse",
    groups: [
      {
        label: "Saddles",
        value: "saddles",
        items: [
          { label: "Dressage Saddles", value: "saddles-dressage" },
          { label: "Jump Saddles", value: "saddles-jump" },
          { label: "All Purpose Saddles", value: "saddles-all-purpose" },
          { label: "Stock Saddles", value: "saddles-stock" },
          { label: "Western Saddles", value: "saddles-western" },
        ],
      },
      { label: "Girths", value: "girths", items: [] },
      {
        label: "Stirrups & Leathers",
        value: "stirrups-leathers",
        items: [
          { label: "Stirrups", value: "stirrups" },
          { label: "Stirrup Leathers", value: "stirrup-leathers" },
        ],
      },
      {
        label: "Saddle Pads",
        value: "saddle-pads",
        items: [
          { label: "Dressage Saddle Pads", value: "pads-dressage" },
          { label: "Jump Saddle Pads", value: "pads-jump" },
          { label: "All Purpose Saddle Pads", value: "pads-all-purpose" },
          { label: "Numnahs", value: "numnahs" },
          { label: "Riser Pads", value: "riser-pads" },
          { label: "Western Saddle Pads", value: "pads-western" },
          { label: "Other Pads", value: "pads-other" },
        ],
      },
      {
        label: "Bridles & Accessories",
        value: "bridles",
        items: [
          { label: "Bridles", value: "bridles-item" },
          { label: "Bits", value: "bits" },
          { label: "Reins", value: "reins" },
          { label: "Bridle Accessories", value: "bridle-accessories" },
          { label: "Breastplates & Martingales", value: "breastplates" },
          { label: "Ear Bonnets", value: "ear-bonnets" },
        ],
      },
      {
        label: "Horse Boots & Bandages",
        value: "boots-bandages",
        items: [
          { label: "Bell Boots", value: "bell-boots" },
          { label: "Brushing Boots", value: "brushing-boots" },
          { label: "Jump Boots", value: "jump-boots" },
          { label: "Float Boots", value: "float-boots" },
          { label: "Hoof Boots", value: "hoof-boots" },
          { label: "Bandages & Pads", value: "bandages-pads" },
          { label: "Western Horse Boots", value: "western-horse-boots" },
        ],
      },
      {
        label: "Rugs",
        value: "rugs",
        items: [
          { label: "Turnout Rugs", value: "turnout-rugs" },
          { label: "Stable Rugs", value: "stable-rugs" },
          { label: "Rug Liners", value: "rug-liners" },
          { label: "Coolers & Fleece Rugs", value: "coolers-fleece" },
          { label: "Summer & Mesh Rugs", value: "summer-mesh-rugs" },
          { label: "Show Rugs & Sheets", value: "show-rugs" },
          { label: "Canvas Rugs", value: "canvas-rugs" },
          { label: "Rug Accessories", value: "rug-accessories" },
        ],
      },
      {
        label: "Stable & Handling",
        value: "stable-handling",
        items: [
          { label: "Halters", value: "halters" },
          { label: "Lead Ropes", value: "lead-ropes" },
          { label: "Fly Veils", value: "fly-veils" },
        ],
      },
      {
        label: "Training & Performance",
        value: "training",
        items: [
          { label: "Lunging Equipment", value: "lunging" },
          { label: "Whips & Crops", value: "whips-crops" },
          { label: "Spurs & Straps", value: "spurs-straps" },
          { label: "Training Aids", value: "training-aids" },
          { label: "Studs", value: "studs" },
        ],
      },
    ],
  },
  {
    value: "rider",
    label: "Rider",
    groups: [
      {
        label: "Clothing",
        value: "clothing",
        items: [
          { label: "Tops", value: "tops" },
          { label: "Breeches", value: "breeches" },
          { label: "Jodhpurs", value: "jodhpurs" },
          { label: "Riding Tights", value: "riding-tights" },
          { label: "Jeans & Pants", value: "jeans-pants" },
          { label: "Competition Shirts", value: "competition-shirts" },
          { label: "Competition Jackets", value: "competition-jackets" },
        ],
      },
      {
        label: "Footwear",
        value: "footwear",
        items: [
          { label: "Tall Boots", value: "tall-boots" },
          { label: "Paddock Boots", value: "paddock-boots" },
          { label: "Chaps", value: "chaps" },
          { label: "Western Boots", value: "western-boots" },
          { label: "Everyday Footwear", value: "everyday-footwear" },
        ],
      },
      {
        label: "Helmets & Safety",
        value: "helmets-safety",
        items: [
          { label: "Helmets", value: "helmets" },
          { label: "Body Protectors", value: "body-protectors" },
        ],
      },
      {
        label: "Rider Accessories",
        value: "rider-accessories",
        items: [
          { label: "Hats & Caps", value: "hats-caps" },
          { label: "Riding Gloves", value: "riding-gloves" },
          { label: "Belts", value: "belts" },
          { label: "Luggage & Bags", value: "luggage-bags" },
          { label: "Competition Accessories", value: "competition-accessories" },
        ],
      },
    ],
  },
  {
    value: "stable",
    label: "Stable",
    groups: [
      {
        label: "Horse Care",
        value: "horse-care",
        items: [
          { label: "Therapy", value: "therapy" },
          { label: "Hay Nets", value: "hay-nets" },
          { label: "Horse Feeders", value: "horse-feeders" },
          { label: "Horse Toys", value: "horse-toys" },
        ],
      },
      {
        label: "Grooming",
        value: "grooming",
        items: [
          { label: "Clippers & Accessories", value: "clippers-accessories" },
          { label: "Plaiting & Presentation", value: "plaiting-presentation" },
          { label: "Other Grooming", value: "other-grooming" },
        ],
      },
      {
        label: "Stable Equipment",
        value: "stable-equipment",
        items: [
          { label: "Forks, Rakes & Pooper Scoopers", value: "forks-rakes" },
          { label: "Arena Accessories", value: "arena-accessories" },
        ],
      },
    ],
  },
];

/** Expand a group value to include all its child item values */
export function expandSubValue(groupValue: string): string[] {
  for (const cat of CATEGORIES) {
    for (const group of cat.groups) {
      if (group.value === groupValue) {
        return [groupValue, ...group.items.map((i) => i.value)];
      }
    }
  }
  return [groupValue];
}

/** Expand an array of sub filter values, resolving group values to all children */
export function expandSubValues(subValues: string[]): string[] {
  const result = new Set<string>();
  for (const v of subValues) {
    expandSubValue(v).forEach((x) => result.add(x));
  }
  return Array.from(result);
}

/** Get display label for any subcategory value */
export function getSubcategoryLabel(value: string): string {
  for (const cat of CATEGORIES) {
    for (const group of cat.groups) {
      if (group.value === value) return group.label;
      for (const item of group.items) {
        if (item.value === value) return item.label;
      }
    }
  }
  return value;
}

/** Get category label */
export function getCategoryLabel(value: string): string {
  return CATEGORIES.find((c) => c.value === value)?.label ?? value;
}
