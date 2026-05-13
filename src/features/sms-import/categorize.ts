// Maps Indian merchants (and the SMS body that mentions them) to one of the
// seeded category names. Returns null when nothing matches so the caller can
// fall back to "Other" / "Other Income".
//
// Order matters. Earlier rules win, so put more specific patterns first
// (e.g. "Swiggy Instamart" must hit Groceries before plain "Swiggy" hits
// Eating Out; "Amazon Pharmacy" must hit Medicines before plain "Amazon"
// hits Shopping).
//
// Matching strategy
// -----------------
// Most patterns are plain substring matches — NO `\b` word boundaries. Real
// SMS texts arrive with merchant names embedded inside concatenated tokens:
//   WWWBIGBASKETCOM, ApolloPharmacyoffline@ybl, swiggyinstamart@axisb,
//   POS UBERINDIA, MYNTRARETURN, etc.
// `\b` only fires between a word char and a non-word char, which never
// happens inside those runs, so a boundary-anchored regex would silently
// miss every one of them.
//
// The handful of patterns that DO keep `\b` are short/ambiguous tokens
// where substring matching would cause false positives — e.g. unanchored
// `cred` matches "credited" (the verb in every debit SMS), `emi` matches
// "remind", `ola` matches "cola". Those stay boundary-anchored.
//
// Category names here MUST exactly match the seeded names in
// migrations/002_seed.ts. If a name is wrong we'd return a string the
// `findCategoryIdByName` lookup can't resolve and silently fall back to
// "Other" — defeating the whole point.

interface CategoryRule {
  category: string;
  patterns: RegExp[];
}

// Built from the 'expense' / 'both' seeded categories. Keep in sync.
const RULES: CategoryRule[] = [
  // -----------------------------------------------------------------
  // 1. Specific cross-brand cases that must win over the broad brand
  //    rules further down (e.g. Swiggy Instamart → Groceries, not
  //    Eating Out; Amazon Pharmacy → Medicines, not Shopping).
  // -----------------------------------------------------------------
  {
    category: 'Groceries',
    patterns: [
      /swiggy[\s_-]*instamart/i,
      /instamart/i,
      /bbnow/i,                    // BigBasket's 15-min arm
      /bb[\s_-]*now/i,
      /bb[\s_-]*daily/i,
      /dmart[\s_-]*ready/i,
      /jio[\s_-]*mart[\s_-]*express/i,
    ],
  },
  {
    category: 'Medicines',
    patterns: [
      /amazon[\s_-]*pharmacy/i,
      /flipkart[\s_-]*health/i,
      /tata[\s_-]*1\s*mg/i,
    ],
  },

  // -----------------------------------------------------------------
  // 2. Pharmacy / Medicines
  // -----------------------------------------------------------------
  {
    category: 'Medicines',
    patterns: [
      /pharm[\s_-]*easy/i,
      /pharmeasy/i,
      /netmeds/i,
      /apollo[\s_-]*pharmacy/i,
      /apollo[\s_-]*247/i,
      /apollo[\s_-]*24[\s_-]*7/i,
      /medplus/i,
      /med[\s_-]*life/i,
      /truemeds/i,
      /wellness[\s_-]*forever/i,
      /frank[\s_-]*ross/i,
      /guardian[\s_-]*pharmacy/i,
      /davaindia/i,
      /generic[\s_-]*art/i,
      /plus[\s_-]*pharmacy/i,
      /healthkart/i,
      /zeno[\s_-]*health/i,
      /(?:phmesy|nethmd|apolph)/i,   // common SMS short codes
      // "1mg" is short; bound it to digit→letter so it doesn't fire on
      // strings like "11mgr" or random numerics.
      /(?:^|[^0-9])1\s*mg(?![a-z0-9])/i,
    ],
  },

  // -----------------------------------------------------------------
  // 3. Food delivery & restaurants → Eating Out
  // -----------------------------------------------------------------
  {
    category: 'Eating Out',
    patterns: [
      // Aggregators
      /swiggy/i,
      /zomato/i,
      /eat[\s_-]*sure/i,
      /eatsure/i,
      /faasos/i,
      /box\s*8/i,
      /fresh[\s_-]*menu/i,
      /freshmenu/i,
      /magicpin/i,
      /uber[\s_-]*eats/i,
      /food[\s_-]*panda/i,
      /foodpanda/i,

      // QSR & chains
      /dominos?/i,                 // "domino" or "dominos"
      /pizza[\s_-]*hut/i,
      /pizzahut/i,
      /mc[\s_-]*donalds?/i,
      /mcdonalds?/i,
      /\bmcd\b/i,                  // keep \b — short
      /\bkfc\b/i,
      /burger[\s_-]*king/i,
      /burgerking/i,
      /subway/i,
      /taco[\s_-]*bell/i,
      /tacobell/i,
      /wow[\s_-]*momo/i,
      /wowmomo/i,
      /haldirams?/i,
      /bikanervala/i,
      /saravana[\s_-]*bhavan/i,
      /behrouz[\s_-]*biryani/i,
      /biryani[\s_-]*by[\s_-]*kilo/i,
      /paradise[\s_-]*biryani/i,
      /sharief[\s_-]*bhai/i,
      /meghana[\s_-]*foods/i,
      /oven[\s_-]*story/i,
      /ovenstory/i,
      /smoor/i,
      /theobroma/i,
      /cult[\s_-]*eats?/i,
      /culteats?/i,

      // Cafes / coffee
      /starbucks/i,
      /cafe[\s_-]*coffee[\s_-]*day/i,
      /\bccd\b/i,                  // keep \b — short
      /barista/i,
      /chai[\s_-]*point/i,
      /chaipoint/i,
      /chayos/i,
      /third[\s_-]*wave[\s_-]*coffee/i,
      /blue[\s_-]*tokai/i,
      /bluetokai/i,
      /tim[\s_-]*hortons?/i,
      /timhortons?/i,
      /dunkin/i,
      /krispy[\s_-]*kreme/i,
      /krispykreme/i,

      // Generic
      /restaurant/i,
      /\bcafe\b/i,
      /dhaba/i,
    ],
  },

  // -----------------------------------------------------------------
  // 4. Groceries (delivery + supermarkets)
  // -----------------------------------------------------------------
  {
    category: 'Groceries',
    patterns: [
      // Quick-commerce
      /blinkit/i,
      /grofers/i,
      /zepto/i,
      /big[\s_-]*basket/i,
      /bigbasket/i,
      /jio[\s_-]*mart/i,
      /jiomart/i,
      /country[\s_-]*delight/i,
      /countrydelight/i,
      /licious/i,
      /fresh[\s_-]*to[\s_-]*home/i,
      /freshtohome/i,
      /zapp[\s_-]*fresh/i,
      /zappfresh/i,
      /milk[\s_-]*basket/i,
      /milkbasket/i,
      /supr[\s_-]*daily/i,
      /suprdaily/i,
      /otipy/i,
      /natures?[\s_-]*basket/i,
      /naturesbasket/i,
      /fresh[\s_-]*hero/i,
      /freshhero/i,

      // Supermarkets & hypermarkets
      /d[\s_-]*mart/i,
      /dmart/i,
      /reliance[\s_-]*fresh/i,
      /reliance[\s_-]*smart/i,
      /more[\s_-]*supermarket/i,
      /more[\s_-]*megastore/i,
      /heritage[\s_-]*fresh/i,
      /star[\s_-]*bazaar/i,
      /starbazaar/i,
      /spencers?/i,
      /easy[\s_-]*day/i,
      /ratnadeep/i,
      /nilgiris/i,
      /vijetha/i,
      /(?:bigbkt|bbasket)/i,         // SMS short codes

      // Generic
      /grocery/i,
      /supermarket/i,
      /kirana/i,
    ],
  },

  // -----------------------------------------------------------------
  // 5. Travel — flights, trains, hotels, buses, rideshare, metro.
  //    (No separate "Commute" category; rideshare lands here too.)
  // -----------------------------------------------------------------
  {
    category: 'Travel',
    patterns: [
      // Rideshare / mobility
      /uber/i,
      /\bola\b/i,                  // keep \b — short, matches "cola"
      /ola[\s_-]*cabs?/i,
      /olacabs?/i,
      /rapido/i,
      /blu[\s_-]*smart/i,
      /blusmart/i,
      /meru[\s_-]*cabs?/i,
      /merucabs?/i,
      /yulu/i,
      /bounce[\s_-]*share/i,
      /bounceshare/i,
      /quick[\s_-]*ride/i,
      /quickride/i,
      /sride/i,
      /bla[\s_-]*bla[\s_-]*car/i,
      /blablacar/i,
      /zoom[\s_-]*car/i,
      /zoomcar/i,
      /drivezy/i,
      /royal[\s_-]*brothers/i,
      /royalbrothers/i,
      /vogo/i,

      // Metro / rail / bus
      /irctc/i,
      /dmrc/i,
      /bmrcl/i,
      /kmrl/i,
      /hmrl/i,
      /cmrl/i,
      /nmrcl/i,
      /metro[\s_-]*rail/i,
      /metrorail/i,
      /red[\s_-]*bus/i,
      /redbus/i,
      /abhi[\s_-]*bus/i,
      /abhibus/i,
      /confirm[\s_-]*tkt/i,
      /confirmtkt/i,
      /trainman/i,
      /rail[\s_-]*yatri/i,
      /railyatri/i,
      /ksrtc/i,
      /msrtc/i,
      /tsrtc/i,
      /apsrtc/i,

      // Travel aggregators / hotels
      /make[\s_-]*my[\s_-]*trip/i,
      /makemytrip/i,
      /\bmmt\b/i,                  // keep \b — short
      /goibibo/i,
      /yatra/i,
      /easy[\s_-]*my[\s_-]*trip/i,
      /easemytrip/i,
      /clear[\s_-]*trip/i,
      /cleartrip/i,
      /ixigo/i,
      /booking\.com/i,
      /agoda/i,
      /airbnb/i,
      /oyo[\s_-]*rooms?/i,
      /oyorooms?/i,
      /oyo[\s_-]*life/i,
      /oyo[\s_-]*hotels?/i,
      /(?:^|[^a-z])oyo(?![a-z])/i, // standalone OYO
      /fab[\s_-]*hotels/i,
      /fabhotels/i,
      /treebo/i,
      /trivago/i,
      /expedia/i,
      /zostel/i,

      // Airlines
      /indigo/i,
      /air[\s_-]*india/i,
      /airindia/i,
      /vistara/i,
      /spice[\s_-]*jet/i,
      /spicejet/i,
      /akasa/i,
      /air[\s_-]*asia/i,
      /airasia/i,
      /go[\s_-]*first/i,
      /gofirst/i,
      /alliance[\s_-]*air/i,
      /emirates/i,
      /qatar[\s_-]*airways/i,
      /singapore[\s_-]*airlines/i,
      /thai[\s_-]*airways/i,
      /lufthansa/i,
    ],
  },

  // -----------------------------------------------------------------
  // 6. Fuel
  // -----------------------------------------------------------------
  {
    category: 'Fuel',
    patterns: [
      /indian[\s_-]*oil/i,
      /indianoil/i,
      /iocl/i,
      /ioc[\s_-]*petrol/i,
      /hpcl/i,
      /hp[\s_-]*petrol/i,
      /bpcl/i,
      /bharat[\s_-]*petroleum/i,
      /bharatpetroleum/i,
      /shell[\s_-]*petrol/i,
      /(?:^|[^a-z])shell(?![a-z])/i,  // standalone "Shell"
      /nayara/i,
      /(?:^|[^a-z])essar(?![a-z])/i,
      /reliance[\s_-]*petrol/i,
      /petrol[\s_-]*pump/i,
      /petrolpump/i,
      /petroleum/i,
      /fuel[\s_-]*station/i,
      /fuelstation/i,
    ],
  },

  // -----------------------------------------------------------------
  // 7. Recharge — mobile + DTH
  // -----------------------------------------------------------------
  {
    category: 'Recharge',
    patterns: [
      /mobile[\s_-]*recharge/i,
      /prepaid[\s_-]*recharge/i,
      // Specific carrier + Reliance Jio combination
      /reliance[\s_-]*jio/i,
      // General carrier patterns with various common suffixes
      /(?:airtel|jio|vodafone|bsnl|mtnl)[\s_-]*[a-zA-Z0-9]*/i,
      /vi[\s_-]*(?:prepaid|recharge|postpaid|plan|mobile)/i,
      /(?:tata[\s_-]*sky|tata[\s_-]*play|dish[\s_-]*tv|sun[\s_-]*direct|airtel[\s_-]*dth|videocon[\s_-]*d2h)/i,
      /tatasky/i,
      /tataplay/i,
      /dishtv/i,
      /sundirect/i,
      /\bd2h\b/i,
      /\bdth\b/i,
    ],
  },

  // -----------------------------------------------------------------
  // 8. Bills — utilities, internet, OTT, insurance
  // -----------------------------------------------------------------
  {
    category: 'Bills',
    patterns: [
      // Electricity
      /electricity[\s_-]*bill/i,
      /electricitybill/i,
      /(?:bescom|kseb|bses|msedcl|mseb|tsspdcl|tgspdcl|apspdcl|tneb|uppcl|mpmkvvcl|pseb|cesc|dhbvn|uhbvn|jvvnl|avvnl|jdvvnl)/i,
      /tata[\s_-]*power/i,
      /tatapower/i,
      /adani[\s_-]*electricity/i,
      /powergrid/i,

      // Water
      /(?:bwssb|mcgm|hmwssb|chmwssb)/i,
      /\bdjb\b/i,
      /\bkwa\b/i,
      /water[\s_-]*bill/i,
      /waterbill/i,

      // Gas (piped + LPG)
      /indane/i,
      /hp[\s_-]*gas/i,
      /hpgas/i,
      /bharat[\s_-]*gas/i,
      /bharatgas/i,
      /mahanagar[\s_-]*gas/i,
      /mahanagargas/i,
      /\bigl\b/i,
      /adani[\s_-]*gas/i,
      /gas[\s_-]*bill/i,
      /gasbill/i,
      /\bpng\b/i,

      // Internet / broadband
      /jio[\s_-]*fiber/i,
      /jiofiber/i,
      /airtel[\s_-]*xstream/i,
      /airtelxstream/i,
      /act[\s_-]*fibernet/i,
      /actfibernet/i,
      /hathway/i,
      /spectra[\s_-]*net/i,
      /tikona/i,
      /broadband/i,

      // OTT / streaming
      /netflix/i,
      /prime[\s_-]*video/i,
      /primevideo/i,
      /amazon[\s_-]*prime/i,
      /amazonprime/i,
      /hot[\s_-]*star/i,
      /hotstar/i,
      /disney\+?/i,
      /jio[\s_-]*cinema/i,
      /jiocinema/i,
      /sony[\s_-]*liv/i,
      /sonyliv/i,
      /zee[\s_-]*5/i,
      /zee5/i,
      /voot/i,
      /mx[\s_-]*player/i,
      /mxplayer/i,
      /alt[\s_-]*balaji/i,
      /altbalaji/i,
      /spotify/i,
      /apple[\s_-]*music/i,
      /applemusic/i,
      /you[\s_-]*tube[\s_-]*premium/i,
      /youtubepremium/i,
      /wynk/i,
      /gaana/i,
      /jio[\s_-]*saavn/i,
      /jiosaavn/i,

      // Insurance
      /lic\s*of\s*india/i,
      /lic[\s_-]*premium/i,
      /care[\s_-]*health/i,
      /carehealth/i,
      /star[\s_-]*health/i,
      /starhealth/i,
      /hdfc[\s_-]*ergo/i,
      /hdfcergo/i,
      /bajaj[\s_-]*allianz/i,
      /bajajallianz/i,
      /tata[\s_-]*aig/i,
      /tataaig/i,
      /icici[\s_-]*lombard/i,
      /icicilombard/i,
      /new[\s_-]*india[\s_-]*assurance/i,
      /niva[\s_-]*bupa/i,
      /nivabupa/i,
      /policy[\s_-]*bazaar/i,
      /policybazaar/i,
      /insurance[\s_-]*premium/i,

      // Credit card bill
      /credit[\s_-]*card[\s_-]*bill/i,
      /creditcardbill/i,
      /cc[\s_-]*bill[\s_-]*payment/i,
    ],
  },

  // -----------------------------------------------------------------
  // 9. EMI / loans
  // -----------------------------------------------------------------
  {
    category: 'EMI',
    patterns: [
      /\bemi\b/i,                   // keep \b — matches "remind", "semi"
      /equated[\s_-]*monthly/i,
      /loan[\s_-]*emi/i,
      /loanemi/i,
      /loan[\s_-]*installment/i,
      /(?:bajaj[\s_-]*finserv|bajaj[\s_-]*finance|baffl)/i,
      /bajajfinserv/i,
      /bajajfinance/i,
      /idfc[\s_-]*first/i,
      /idfcfirst/i,
      /tata[\s_-]*capital/i,
      /tatacapital/i,
      /mahindra[\s_-]*finance/i,
      /mahindrafinance/i,
      /capital[\s_-]*first/i,
      /cholamandalam/i,
      /nach[\s_-]*(?:debit|emi)/i,
      /\bcred\b/i,                  // keep \b — matches "credited"
    ],
  },

  // -----------------------------------------------------------------
  // 10. SIP / investments
  // -----------------------------------------------------------------
  {
    category: 'SIP',
    patterns: [
      /\bsip\b/i,                   // keep \b — matches "sipping"
      /mutual[\s_-]*fund/i,
      /mutualfund/i,
      /zerodha/i,
      /groww/i,
      /upstox/i,
      /kuvera/i,
      /et[\s_-]*money/i,
      /etmoney/i,
      /small[\s_-]*case/i,
      /smallcase/i,
      /paytm[\s_-]*money/i,
      /paytmmoney/i,
      /ind[\s_-]*money/i,
      /indmoney/i,
      /niyo/i,
      /cube[\s_-]*wealth/i,
      /cubewealth/i,
      /jar[\s_-]*app/i,
      /icici[\s_-]*pru/i,
      /icicipru/i,
      /hdfc[\s_-]*mutual/i,
      /hdfcmutual/i,
      /sbi[\s_-]*mutual/i,
      /sbimutual/i,
      /mirae[\s_-]*asset/i,
      /miraeasset/i,
      /axis[\s_-]*mutual/i,
      /axismutual/i,
      /uti[\s_-]*mutual/i,
      /utimutual/i,
      /nippon[\s_-]*india/i,
      /nipponindia/i,
      /aditya[\s_-]*birla[\s_-]*sun[\s_-]*life/i,
      /aditya[\s_-]*birla[\s_-]*mutual/i,
      /dsp[\s_-]*mutual/i,
      /dspmutual/i,
      /bse[\s_-]*star[\s_-]*mf/i,
      /kfintech/i,
      /\bkfin\b/i,
      /\bnsdl\b/i,
      /\bcdsl\b/i,
    ],
  },

  // -----------------------------------------------------------------
  // 11. E-commerce / general shopping — broad, runs last so the more
  //     specific brand+category combos above (Swiggy Instamart, Amazon
  //     Pharmacy) win first.
  // -----------------------------------------------------------------
  {
    category: 'Shopping',
    patterns: [
      // Marketplaces
      /amazon/i,
      /flipkart/i,
      /myntra/i,
      /meesho/i,
      /\bajio\b/i,
      /nykaa/i,
      /tata[\s_-]*cliq/i,
      /tatacliq/i,
      /snapdeal/i,
      /shopclues/i,
      /lime[\s_-]*road/i,
      /limeroad/i,
      /first[\s_-]*cry/i,
      /firstcry/i,
      /pepperfry/i,
      /urban[\s_-]*ladder/i,
      /urbanladder/i,
      /lenskart/i,

      // Electronics
      /croma/i,
      /reliance[\s_-]*digital/i,
      /reliancedigital/i,
      /vijay[\s_-]*sales/i,
      /vijaysales/i,

      // DTC brands
      /boat[\s_-]*lifestyle/i,
      /boatlifestyle/i,
      /mamaearth/i,
      /sugar[\s_-]*cosmetics/i,
      /sugarcosmetics/i,
      /plum[\s_-]*goodness/i,
      /plumgoodness/i,
      /m[\s_-]*caffeine/i,
      /mcaffeine/i,
      /bewakoof/i,

      // Apparel / department stores
      /decathlon/i,
      /adidas/i,
      /(?:^|[^a-z])nike(?![a-z])/i,  // bound — "nike" is short-ish
      /(?:^|[^a-z])puma(?![a-z])/i,
      /\bikea\b/i,
      /h\s*&\s*m\b/i,
      /(?:^|[^a-z])zara(?![a-z])/i,
      /marks\s*&\s*spencer/i,
      /levis?/i,
      /shoppers[\s_-]*stop/i,
      /shoppersstop/i,
      /lifestyle[\s_-]*store/i,
      /lifestylestore/i,
      /westside/i,
      /pantaloons/i,
      /reliance[\s_-]*trends/i,
      /reliancetrends/i,
      /max[\s_-]*fashion/i,
      /maxfashion/i,

      // SMS short-codes seen in refund senders & elsewhere
      /(?:flpkrt|flipkrt)/i,
    ],
  },
];

// Returns a category name (matching a seeded category) for an SMS-parsed
// transaction, or null if nothing matched. Matches against both the
// extracted merchant string and the raw SMS body, so it still works when
// the bank parser couldn't pluck out a clean merchant (the brand name is
// often elsewhere in the body — "credited via ... towards SWIGGY ORDER").
export function detectCategoryName(
  merchant: string | null,
  body: string,
  kind: 'expense' | 'income',
): string | null {
  // We don't infer income categories — there are only 3 (Salary, Refund,
  // Other Income) and refunds are detected upstream by the parser itself.
  if (kind !== 'expense') return null;

  const haystack = `${merchant ?? ''} ${body}`;
  for (const rule of RULES) {
    for (const pattern of rule.patterns) {
      if (pattern.test(haystack)) return rule.category;
    }
  }
  return null;
}
