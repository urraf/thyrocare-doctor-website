// First-run content. Loaded into MongoDB once (when the database is empty);
// after that everything is edited from /admin.

const LIPID = ["Total cholesterol", "Triglycerides", "HDL cholesterol - direct", "HDL / LDL ratio", "LDL cholesterol - direct", "LDL / HDL ratio", "Non-HDL cholesterol", "TC / HDL cholesterol ratio", "Trig / HDL ratio", "VLDL cholesterol"];
const LIVER_ADV = ["Bilirubin - total", "SGOT / SGPT ratio", "Aspartate Aminotransferase (SGOT)", "Alanine Transaminase (SGPT)", "Alkaline Phosphatase", "Bilirubin - direct", "Bilirubin (Indirect)", "Serum alb/globulin ratio", "Protein - total", "Albumin - serum", "Serum Globulin"];
const LIVER_EXT = [...LIVER_ADV, "Gamma Glutamyl Transferase (GGT)"];
const KIDNEY_BASIC = ["BUN / Sr. creatinine ratio", "Blood urea nitrogen (BUN)", "Creatinine - serum", "Urea / Sr. creatinine ratio", "Urea (calculated)"];
const KIDNEY_ADV = [...KIDNEY_BASIC, "Calcium", "Uric acid"];
const DIABETES = ["HbA1c", "Average blood glucose (ABG)"];
const VITAMINS = ["25-OH Vitamin D (Total)", "Vitamin B-12"];
const IRON = ["Iron", "% Transferrin saturation", "Total Iron Binding Capacity (TIBC)", "Unsat. iron-binding capacity (UIBC)"];
const URINE = ["Specific gravity", "Appearance", "Bacteria", "Urinary bilirubin", "Urine blood", "Urobilinogen", "Bile pigment", "Bile salt", "Casts", "Colour", "Crystals", "Epithelial cells", "Urinary glucose", "Urine ketone", "Leucocyte esterase", "Urinary leucocytes (pus cells)", "Mucus", "Nitrite", "Parasite", "pH", "Urinary protein", "Red blood cells", "Volume", "Yeast"];
const g = (name, items, count) => ({ name, count: count ?? items.length, items });
const CBC = g("CBC (Complete Blood Count)", [], 28);
const FASTING_NOTE = "10–12 hrs fasting is essential · Valid for a limited period";

export const PROFILES = [
  {
    code: "AAROGYAM-B-PRO", name: "Aarogyam B Pro", poster: "aarogyam-b-pro.jpg", params: 59, price: 1999, best: true, featured: true,
    tagline: "The best time to get a preventive health checkup is when you don't need one.",
    desc: "A complete yearly checkup: thyroid, heart, liver, kidney, diabetes, vitamins and full blood count.",
    groups: [g("Thyroid Basic", ["TSH - Ultrasensitive"]), g("Lipid Advanced", LIPID), g("Liver Advanced", LIVER_ADV), g("Kidney Basic", KIDNEY_BASIC), g("Diabetes Profile", DIABETES), g("Vitamins Profile", VITAMINS), CBC],
    note: FASTING_NOTE, fasting: true, concerns: ["full-body"],
  },
  {
    code: "AAROGYAM-B-PLUS", name: "Aarogyam B Plus", poster: "aarogyam-b-plus.jpg", params: 83, price: 2299, featured: true,
    tagline: "Don't wait for an illness to strike. Get a preventive checkup today!",
    desc: "Everything in B Pro plus a complete urine analysis (24 parameters).",
    groups: [g("Thyroid Basic", ["TSH - Ultrasensitive"]), g("Lipid Advanced", LIPID), g("Liver Advanced", LIVER_ADV), g("Kidney Basic", KIDNEY_BASIC), g("Diabetes Profile", DIABETES), g("Vitamins Profile", VITAMINS), CBC, g("Complete Urine Analysis", URINE)],
    note: FASTING_NOTE, fasting: true, concerns: ["full-body"],
  },
  {
    code: "AAROGYAM-B-PLUS-UTSH", name: "Aarogyam B Plus with UTSH", poster: "aarogyam-b-plus-utsh.jpg", params: 93, price: 2350, featured: true,
    tagline: "Don't wait for an illness to strike. Get a preventive checkup today!",
    desc: "Our most complete checkup: full thyroid, iron, electrolytes, urine analysis and fasting sugar.",
    groups: [g("Thyroid Profile", ["Ultrasensitive TSH (UTSH)", "Total Thyroxine (T4)", "Total Triiodothyronine (T3)"]), g("Lipid Profile", LIPID), g("Liver Profile", LIVER_EXT), g("Kidney Profile", KIDNEY_ADV), g("Iron Deficiency Profile", IRON), g("Serum Electrolytes", ["Sodium", "Chloride"]), g("Complete Urine Analysis", URINE), g("Fasting Blood Sugar", [], 1), g("Diabetes Profile", DIABETES), CBC],
    note: FASTING_NOTE, fasting: true, concerns: ["full-body", "thyroid"],
  },
  {
    code: "AAROGYAM-C-PRO", name: "Aarogyam C Pro", poster: "aarogyam-c-pro.jpg", params: 71, price: 2999, featured: true,
    tagline: "Make a wise investment today, avoid a forced expenditure tomorrow.",
    desc: "Advanced thyroid, extended liver, advanced kidney, iron, electrolytes and hs-CRP heart marker.",
    groups: [g("Thyroid Advanced", ["TSH - Ultrasensitive", "Total Thyroxine (T4)", "Total Triiodothyronine (T3)"]), g("Lipid Advanced", LIPID), g("Liver Extended", LIVER_EXT), g("Kidney Advanced", KIDNEY_ADV), g("Iron Deficiency Profile", IRON), g("Diabetes Profile", DIABETES), g("Vitamins Profile", VITAMINS), g("Electrolytes", ["Sodium", "Chloride"]), CBC, g("High Sensitivity C-Reactive Protein (hs-CRP)", [], 1)],
    note: FASTING_NOTE, fasting: true, concerns: ["full-body", "heart"],
  },
  {
    code: "USTSH-LH-FSH-PRL", name: "USTSH-LH-FSH-PRL", poster: "ustsh-lh-fsh-prl.jpg", params: 4, price: 1670, featured: true,
    tagline: "Hormone check for women planning a pregnancy.",
    desc: "The combined estimation of USTSH, LH, FSH and PRL helps diagnose abnormal levels that can lead to infertility in women.",
    groups: [g("Profile includes", ["TSH - Ultrasensitive (USTSH)", "Luteinising Hormone (LH)", "Follicle Stimulating Hormone (FSH)", "Prolactin (PRL)"])],
    note: "", concerns: ["womens", "thyroid"],
  },
  {
    code: "AMH-ADVANCED", name: "AMH Advanced Profile", poster: "amh-advanced.jpg", params: 6, price: 3365, featured: true,
    tagline: "Trouble conceiving? Get your AMH Advanced Profile done.",
    desc: "The AMH test assesses a woman's ovarian reserve (egg count) and gives information about the ability to get pregnant. It may also be used to evaluate menstrual disorders.",
    groups: [g("Infertility Profile", ["Anti Mullerian Hormone (AMH)", "Follicle Stimulating Hormone (FSH)", "Luteinising Hormone (LH)", "Prolactin (PRL)"]), g("Estradiol / oestrogen (E2)", [], 1), g("Ultrasensitive TSH (UTSH)", [], 1)],
    note: "", concerns: ["womens"],
  },
  {
    code: "JAANCH-CSMB", name: "Jaanch Cancer Screening Male Basic", poster: "cancer-screening-male-basic.jpg", params: 3, price: 1385, featured: true,
    tagline: "We CAN-CERtainly beat it, with Jaanch.",
    desc: "1 in 9 Indians are likely to develop cancer in their lifetime. Early screening with three key tumour markers.",
    groups: [g("Profile includes", ["CA 19.9", "Carcino Embryonic Antigen (CEA)", "Prostate Specific Antigen (PSA)"])],
    note: "Valid for a limited period", concerns: ["cancer"],
  },
];

// Thyrocare "Jaanch" rate card. price: null shows "Ask for best rate".
export const PACKAGES = [
  ["JAANCHTPB", "Thyroid Profile Basic", "Thyroid", 999, "A focused thyroid check. Ideal for tiredness, weight change or hair fall.", { best: true }],
  ["JAANCHTPA", "Thyroid Profile Advanced", "Thyroid", 1999, "Deeper thyroid evaluation for diagnosed patients and follow-ups."],
  ["JHHB", "Healthy Heart Basic", "Heart", 1000, "Know your heart risk early, especially after 30 or with family history."],
  ["JHHAA", "Healthy Heart Advanced", "Heart", 2000, "Extended cardiac risk screening, doctor-curated."],
  ["JAADPB", "Diabetic Profile Basic", "Diabetes", 1500, "Essential sugar-control monitoring for diabetics and pre-diabetics."],
  ["JAADPA", "Diabetic Profile Advanced", "Diabetes", 4000, "Comprehensive diabetes check, including its effect on other organs."],
  ["JAANCHPM", "PCOD Mini", "Women's Health", 2500, "A starting point for irregular periods, acne or weight concerns."],
  ["JAANCHPC", "PCOD Basic", "Women's Health", 3500, "Hormonal screening for suspected PCOD/PCOS."],
  ["JAANCHPA", "PCOD Advanced", "Women's Health", 4500, "Complete hormonal and metabolic PCOD evaluation."],
  ["JIPB", "Infertility Profile Basic", "Women's Health", null, "First-line fertility screening, as advised by your gynaecologist."],
  ["JIPAA", "Infertility Profile Advanced", "Women's Health", null, "Detailed fertility hormone profile."],
  ["JAANCHWSCC", "Women's Skin Care Checkup", "Skin & Hair", null, "Finds internal causes behind acne, pigmentation and dull skin."],
  ["JMSCC", "Men's Skin Care Checkup", "Skin & Hair", null, "Internal causes behind skin problems in men."],
  ["JWHSA", "Women's Hairfall Screening Advanced", "Skin & Hair", null, "Vitamin, hormone and thyroid causes of hair fall."],
  ["JMHSA", "Men's Hairfall Screening Advanced", "Skin & Hair", null, "Finds the cause before you spend on treatments."],
  ["JTPF", "Tumour Panel (Female)", "Cancer Screening", null, "Tumour-marker screening for women. Discuss results with your doctor."],
  ["JTPM", "Tumour Panel (Male)", "Cancer Screening", null, "Tumour-marker screening for men. Discuss results with your doctor."],
  ["JMFPB", "Monsoon Fever Panel Basic", "Fever", null, "For fever during the rainy season: common infections checked together."],
  ["JMFPA", "Monsoon Fever Panel Advanced", "Fever", null, "Wider monsoon-fever screen in one sample."],
  ["JMFPAII", "Monsoon Fever Panel Advanced + Influenza", "Fever", null, "Monsoon fever panel including influenza."],
  ["JWFPB", "Winter Fever Panel Basic", "Fever", null, "For winter fevers: common causes checked together."],
  ["JWFPA", "Winter Fever Panel Advanced", "Fever", null, "Wider winter-fever screen in one sample."],
  ["JWFPAII", "Winter Fever Panel Advanced + Influenza", "Fever", null, "Winter fever panel including influenza."],
  ["KKKMM", "STD Profile Basic", "Sexual Health", null, "Confidential screening. Your privacy is fully respected."],
];

export const TESTS = [
  ["T-CBC", "CBC (Complete Blood Count)", "Routine", "Haemoglobin, infection and anaemia check."],
  ["T-TFT", "Thyroid Profile (T3, T4, TSH)", "Thyroid", "The standard thyroid test."],
  ["T-LIPID", "Lipid Profile", "Heart", "Cholesterol and triglycerides.", { fasting: true }],
  ["T-FBS", "Blood Sugar Fasting", "Diabetes", "Fasting glucose level.", { fasting: true }],
  ["T-PPBS", "Blood Sugar PP", "Diabetes", "Glucose 2 hours after a meal."],
  ["T-HBA1C", "HbA1c", "Diabetes", "Your average sugar over 3 months. No fasting needed."],
  ["T-LFT", "Liver Function Test (LFT)", "Routine", "Liver enzymes, bilirubin and proteins."],
  ["T-KFT", "Kidney Function Test (KFT)", "Routine", "Creatinine, urea and electrolytes."],
  ["T-VITD", "Vitamin D (25-OH)", "Vitamins", "Common cause of body pain and fatigue."],
  ["T-B12", "Vitamin B12", "Vitamins", "Numbness, weakness and memory concerns."],
  ["T-IRON", "Iron Studies", "Vitamins", "Iron stores and anaemia type."],
  ["T-URINE", "Urine Routine & Microscopy", "Routine", "Infection, sugar and protein in urine."],
  ["T-URIC", "Uric Acid", "Routine", "Joint pain and gout check."],
  ["T-CRP", "CRP", "Fever", "Inflammation and infection marker."],
  ["T-ESR", "ESR", "Fever", "General inflammation marker."],
  ["T-DENGUE", "Dengue NS1 Antigen", "Fever", "Early dengue detection."],
  ["T-WIDAL", "Typhoid (Widal)", "Fever", "Typhoid screening."],
  ["T-MALARIA", "Malaria Antigen", "Fever", "Rapid malaria detection."],
  ["T-CALC", "Calcium", "Vitamins", "Bone and muscle health."],
  ["T-TESTO", "Testosterone", "Hormones", "Male hormone level."],
  ["T-PRL", "Prolactin", "Hormones", "Irregular periods and fertility."],
  ["T-AMH", "AMH", "Hormones", "Ovarian reserve and fertility planning."],
  ["T-PSA", "PSA", "Hormones", "Prostate screening for men over 50."],
  ["T-SPUTUM", "Sputum Examination", "Other Samples", "Chest infection and TB screening."],
  ["T-TISSUE", "Tissue / Biopsy (Histopathology)", "Other Samples", "Tissue samples sent to Thyrocare lab."],
];

// Concern tags for packages and single tests (profiles carry their own above).
export const CONCERN_TAGS = {
  "full-body": ["T-CBC", "T-LFT", "T-KFT", "T-LIPID", "T-TFT"],
  fever: ["JMFPB", "JMFPA", "JMFPAII", "JWFPB", "JWFPA", "JWFPAII", "T-DENGUE", "T-MALARIA", "T-WIDAL", "T-CBC", "T-CRP"],
  diabetes: ["JAADPB", "JAADPA", "T-HBA1C", "T-FBS", "T-PPBS"],
  heart: ["JHHB", "JHHAA", "T-LIPID", "T-CRP"],
  thyroid: ["JAANCHTPB", "JAANCHTPA", "T-TFT"],
  womens: ["JAANCHPM", "JAANCHPC", "JAANCHPA", "JIPB", "JIPAA", "T-PRL", "T-AMH", "T-TFT"],
  kidney: ["T-KFT", "T-URIC", "T-URINE"],
  liver: ["T-LFT"],
  vitamins: ["T-VITD", "T-B12", "T-IRON", "T-CALC"],
  bone: ["T-VITD", "T-CALC", "T-URIC"],
  "skin-hair": ["JAANCHWSCC", "JMSCC", "JWHSA", "JMHSA", "T-VITD", "T-IRON"],
  cancer: ["JTPF", "JTPM", "T-PSA", "T-TISSUE"],
};

export const TEAM = [
  { name: "Dr Farhat Shaheen", role: "Doctor · Certified Specimen Collection", isDoctor: true, cert: "farhat-shaheen.jpg" },
  { name: "Irfan M Zaidi", role: "Thyrocare Trained Service Provider, UP166", isDoctor: false, lead: true, cert: "irfan-zaidi-provider.jpg" },
  { name: "Mrs Rumza Jafar", role: "Certified Specimen Collection Technician", cert: "rumza-jafar.jpg" },
  { name: "Ms Anam Fatima", role: "Certified Specimen Collection Technician", cert: "anam-fatima.jpg" },
  { name: "Ms Aiman Fatima", role: "Certified Specimen Collection Technician", cert: "aiman-fatima.jpg" },
  { name: "Mohd Faheem", role: "Certified Specimen Collection Technician", cert: "mohd-faheem.jpg" },
];

export const FAQS = [
  ["Is this an official Thyrocare centre?", "Yes. We are a Thyrocare Authorised Service Centre with code **UP166**, at Mansoor Nagar, Lucknow, and have been a Thyrocare franchisee for **10 years**. Our centre is approved by **NABL & ILAC-MRA**, and our team is trained and certified by Thyrocare Technologies Ltd."],
  ["Which full body checkup should I choose?", "**Aarogyam B Pro** (59 parameters) is a great yearly checkup. Choose **B Plus** (83) if you also want a complete urine analysis, or **C Pro** (71) for advanced thyroid, iron, electrolytes and hs-CRP. Not sure? WhatsApp us your age and concerns and we'll suggest the right one."],
  ["Where is my sample actually tested?", "In Thyrocare's own laboratory at CP-67, Viraj Khand, Gomti Nagar, Lucknow."],
  ["Do I need a doctor's prescription?", "No. You can simply tell us the test names. If you have a prescription, upload a photo and we'll work out the tests and the best rate for you within 30 minutes."],
  ["Do you collect samples at home?", "Yes. Book using the form above or call us, and a certified collector will come to your home at the time you choose. You're also welcome to visit our centre near CMS Ashrafabad."],
  ["Which samples can you collect?", "Blood, urine, sputum, tissue and more. Thyrocare offers a very wide test menu, so if you don't see your test listed here, just ask."],
  ["How will I receive my report?", "Reports are shared digitally so you don't have to come back. We'll tell you the expected report time for your specific test when you book."],
];

export const SETTINGS = {
  announcement: { enabled: true, text: "Full body checkup Aarogyam B Pro (59 parameters) now at ₹1,999. Limited period offer.", link: "#profiles" },
  whatsapp: "7080014014",
  phones: ["7080014014", "9935555674", "7080441100"],
  emails: ["inaxces@gmail.com", "irfan.up166@thyrocare.com"],
  addressShort: "Mansoor Nagar Tiraha, Lucknow",
  address: "Mansoor Nagar Tiraha, Near CMS Ashrafabad Branch, Lucknow – 226003",
  mapQuery: "Mansoor Nagar Tiraha, CMS Ashrafabad, Lucknow 226003",
  topbarNote: "Home sample collection across Lucknow",
  hero: {
    badge: "NABL & ILAC-MRA approved Thyrocare centre",
    title: "Lab tests at home in Lucknow,",
    highlight: "by a team you can trust.",
    hindi: "घर बैठे जाँच, पूरे भरोसे के साथ।",
    lead: "Lucknow's trusted Thyrocare centre for **10 years**. WhatsApp your prescription and get the best rate **within 30 minutes**. A certified collector comes to your home, and your sample is tested in Thyrocare's own labs.",
  },
  stats: [
    { value: "10 years", label: "Thyrocare franchisee in Lucknow" },
    { value: "Zero", label: "Complaints in 10 years" },
    { value: "NABL", label: "& ILAC-MRA approved centre" },
    { value: "30 min", label: "Rate reply on WhatsApp" },
  ],
  labFacts: [
    { title: "Only centre in the region approved by NABL & ILAC-MRA", note: "Thyrocare Service Centre UP166, Mansoor Nagar" },
    { title: "First diagnostic chain with 100% NABL-accredited labs", note: "Thyrocare Technologies Ltd.* (as on 5 Dec 2024)" },
    { title: "CAP accredited since 2007", note: "College of American Pathologists*" },
    { title: "98% of reports released within 6 hours", note: "After samples reach the Thyrocare lab*" },
    { title: "CP-67, Viraj Khand, Gomti Nagar, Lucknow", note: "Thyrocare lab in Lucknow" },
  ],
  footerNote: "NABL & ILAC-MRA approved · Serving Lucknow for 10 years",
  seoTitle: "Thyrocare Lucknow · Home Blood Test Collection | NABL Approved Centre UP166",
  seoDescription: "NABL & ILAC-MRA approved Thyrocare Service Centre (UP166), Mansoor Nagar, Lucknow. Thyrocare franchisee for 10 years. Full body checkups, home sample collection, best rates on WhatsApp within 30 minutes.",
};
