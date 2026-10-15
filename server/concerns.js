// "Browse by health concern" tiles. Items (profiles, packages, tests) are tagged with these keys
// in the admin panel; the icon ids refer to the Healthicons sprite in public/index.html.
export const CONCERNS = [
  { key: "full-body", label: "Full Body", sub: "Complete checkup", icon: "h-body" },
  { key: "fever", label: "Fever", sub: "Dengue, typhoid…", icon: "h-fever" },
  { key: "diabetes", label: "Diabetes", sub: "Sugar control", icon: "h-diabetes-measure" },
  { key: "heart", label: "Heart", sub: "Cholesterol & risk", icon: "h-heart-organ" },
  { key: "thyroid", label: "Thyroid", sub: "T3, T4, TSH", icon: "h-thyroid" },
  { key: "womens", label: "Women's Health", sub: "PCOD, fertility", icon: "h-female-reproductive-system" },
  { key: "kidney", label: "Kidney", sub: "KFT, urine", icon: "h-kidneys" },
  { key: "liver", label: "Liver", sub: "LFT", icon: "h-liver" },
  { key: "vitamins", label: "Vitamins", sub: "D, B12, iron", icon: "h-pills-2" },
  { key: "bone", label: "Bone & Joint", sub: "Pain, gout", icon: "h-joints" },
  { key: "skin-hair", label: "Skin & Hair", sub: "Hair fall, acne", icon: "h-head" },
  { key: "cancer", label: "Cancer Screening", sub: "Tumour markers", icon: "h-tumour" },
];

export const CONCERN_KEYS = new Set(CONCERNS.map((c) => c.key));
