// Official KSSM Sejarah chapter (Bab) titles in Bahasa Malaysia, keyed by the
// grade and chapter number. The trial-paper source documents title their
// chapters in English; the portal uses these instead, because the questions
// themselves are in Malay and this is how the syllabus names them.
//
// Cross-checked against two independent Malaysian syllabus references; the
// English chapter names in the source map onto these one for one, in order.
//
// Shared by scripts/import-sejarah.mjs and scripts/rename-sejarah-bm.mjs, and
// kept in its own module so importing the titles cannot trigger either script.
export const SEJARAH_BM_TITLES = {
  "Form 4": {
    1: "Warisan Negara Bangsa",
    2: "Kebangkitan Nasionalisme",
    3: "Konflik Dunia dan Pendudukan Jepun di Negara Kita",
    4: "Era Peralihan Kuasa British di Negara Kita",
    5: "Persekutuan Tanah Melayu 1948",
    6: "Ancaman Komunis dan Pengisytiharan Darurat",
    7: "Usaha ke Arah Kemerdekaan",
    8: "Pilihan Raya",
    9: "Perlembagaan Persekutuan Tanah Melayu 1957",
    10: "Pemasyhuran Kemerdekaan",
  },
  "Form 5": {
    1: "Kedaulatan Negara",
    2: "Perlembagaan Persekutuan",
    3: "Raja Berperlembagaan dan Demokrasi Berparlimen",
    4: "Sistem Persekutuan",
    5: "Pembentukan Malaysia",
    6: "Cabaran Selepas Pembentukan Malaysia",
    7: "Membina Kesejahteraan Negara",
    8: "Membina Kemakmuran Negara",
    9: "Dasar Luar Malaysia",
    10: "Kecemerlangan Malaysia di Persada Dunia",
  },
};

// "Form 4" is the value the whole app and the Grade master data use; this is
// only for wording the Malay descriptions.
export const TINGKATAN = { "Form 4": "Tingkatan 4", "Form 5": "Tingkatan 5" };
