export type CategoryDefinition = { key: string; label: string; eyebrow: string; options: string[]; queries: Record<string, string[]> };
const def = (key: string, label: string, eyebrow: string, queries: Record<string, string[]>): CategoryDefinition => ({ key, label, eyebrow, options: Object.keys(queries), queries });
const food = '["amenity"~"^(restaurant|cafe|fast_food|food_court|ice_cream)$"]';
const cuisine = (value: string) => [`${food}["cuisine"~"${value}",i]`];
export const foodTerms: Record<string, string[]> = {
  Amerikanskt: ['American','New American'], Italienskt: ['Italian'], Pizza: ['Pizza'], Japanskt: ['Japanese'], Sushi: ['Sushi'], Kinesiskt: ['Chinese'], Koreanskt: ['Korean'], Thailändskt: ['Thai'], Vietnamesiskt: ['Vietnamese'], Indiskt: ['Indian'], Mexikanskt: ['Mexican'], Karibiskt: ['Caribbean'], Franskt: ['French'], Grekiskt: ['Greek'], Medelhav: ['Mediterranean'], Mellanöstern: ['Middle Eastern','Turkish','Lebanese'], Hamburgare: ['Hamburgers'], 'Fisk & skaldjur': ['Seafood'], Steakhouse: ['Steakhouse'], Vegetariskt: ['Vegetarian'], Veganskt: ['Vegan'], 'Bagels & deli': ['Bagels','Delicatessen','Sandwiches'], 'Kaffe & bageri': ['Coffee','Bakery','Donuts'], 'Glass & dessert': ['Ice Cream','Dessert','Frozen Desserts'], Kosher: ['Kosher'], Spanskt: ['Spanish','Tapas']
};
export const categoryDefinitions = [
  def('Restauranger','Restauranger','Vilken mat vill du ha?', {
    Alla:[food], Amerikanskt:cuisine('american'), Italienskt:cuisine('italian'), Pizza:cuisine('pizza'), Japanskt:cuisine('japanese'), Sushi:cuisine('sushi'), Kinesiskt:cuisine('chinese'), Koreanskt:cuisine('korean'), Thailändskt:cuisine('thai'), Vietnamesiskt:cuisine('vietnamese'), Indiskt:cuisine('indian'), Mexikanskt:cuisine('mexican'), Karibiskt:cuisine('caribbean|jamaican'), Franskt:cuisine('french'), Grekiskt:cuisine('greek'), Medelhav:cuisine('mediterranean'), Mellanöstern:cuisine('middle_eastern|turkish|lebanese'), Hamburgare:cuisine('burger'), 'Fisk & skaldjur':cuisine('seafood'), Steakhouse:cuisine('steak'), Vegetariskt:[`${food}["diet:vegetarian"~"yes|only"]`,...cuisine('vegetarian')], Veganskt:[`${food}["diet:vegan"~"yes|only"]`,...cuisine('vegan')], 'Bagels & deli':cuisine('bagel|deli|sandwich'), 'Kaffe & bageri':['["amenity"="cafe"]','["shop"="bakery"]'], 'Glass & dessert':['["amenity"="ice_cream"]',...cuisine('dessert|ice_cream')], Kosher:[`${food}["diet:kosher"~"yes|only"]`], Spanskt:cuisine('spanish|tapas')
  }),
  def('Klädbutiker','Kläder','Vilka klädbutiker?', {
    Alla:['["shop"~"^(clothes|fashion|boutique|department_store|second_hand)$"]'], Dam:['["shop"="clothes"]["clothes"~"women"]'], Herr:['["shop"="clothes"]["clothes"~"(^|;)men(;|$)"]'], Barn:['["shop"="clothes"]["clothes"~"children|baby"]'], Vintage:['["shop"="clothes"]["second_hand"~"yes|only"]','["shop"="second_hand"]'], Varuhus:['["shop"="department_store"]'], Sportkläder:['["shop"="clothes"]["clothes"~"sport"]','["shop"="sports"]'], Underkläder:['["shop"="clothes"]["clothes"~"underwear"]'], Bröllop:['["shop"="clothes"]["clothes"~"wedding"]'], Accessoarer:['["shop"~"^(fashion_accessories|bag|jewelry|watches)$"]']
  }),
  def('Sneakers','Sneakers & skor','Vilka skor?', {
    Alla:['["shop"~"^(shoes|sports)$"]'], Skobutiker:['["shop"="shoes"]'], Sportbutiker:['["shop"="sports"]'], Löpning:['["shop"~"^(shoes|sports)$"]["sport"~"running|athletics"]'], Basket:['["shop"~"^(shoes|sports)$"]["sport"~"basketball"]']
  }),
  def('Butiker','Övriga butiker','Vad vill du handla?', {
    Alla:['["shop"]["shop"!~"^(vacant|yes|no)$"]'], Böcker:['["shop"="books"]'], 'Skivor & vinyl':['["shop"="music"]'], Design:['["shop"~"^(interior_decoration|furniture|houseware)$"]'], Antikviteter:['["shop"="antiques"]'], Smycken:['["shop"~"^(jewelry|watches)$"]'], Kamera:['["shop"="photo"]'], Elektronik:['["shop"~"^(electronics|computer|mobile_phone)$"]'], Leksaker:['["shop"="toys"]'], Skönhet:['["shop"~"^(cosmetics|perfumery)$"]'], Presenter:['["shop"~"^(gift|souvenir)$"]'], Livsmedel:['["shop"~"^(supermarket|convenience|deli|cheese|chocolate|tea|coffee)$"]'], 'Musikinstrument':['["shop"="musical_instrument"]']
  }),
  def('Museum','Museum','Vilka museum?', {
    Alla:['["tourism"="museum"]'], Konst:['["tourism"="museum"]["museum"~"art"]'], Historia:['["tourism"="museum"]["museum"~"history|archaeological"]'], 'Natur & vetenskap':['["tourism"="museum"]["museum"~"science|natural_history"]'], Teknik:['["tourism"="museum"]["museum"~"technology|transport|railway|aviation"]'], 'Design & mode':['["tourism"="museum"]["museum"~"design|fashion"]'], Barn:['["tourism"="museum"]["museum"~"children"]']
  }),
  def('Utställningar','Gallerier','Vilka konstplatser?', {
    Alla:['["tourism"="gallery"]','["amenity"="arts_centre"]'], Gallerier:['["tourism"="gallery"]'], Kulturhus:['["amenity"="arts_centre"]'], 'Offentlig konst':['["tourism"="artwork"]'], Skulpturer:['["tourism"="artwork"]["artwork_type"="sculpture"]'], Väggmålningar:['["tourism"="artwork"]["artwork_type"="mural"]']
  }),
  def('Sevärdheter','Sevärdheter','Vad vill du uppleva?', {
    Alla:['["tourism"~"^(attraction|viewpoint)$"]','["historic"~"^(monument|memorial|fort|castle|ruins)$"]','["leisure"~"^(park|garden)$"]','["man_made"="bridge"]["name"]'], Landmärken:['["tourism"="attraction"]'], Utsiktsplatser:['["tourism"="viewpoint"]'], Parker:['["leisure"="park"]'], Trädgårdar:['["leisure"="garden"]'], 'Monument & minnesplatser':['["historic"~"^(monument|memorial)$"]'], 'Historiska platser':['["historic"~"^(fort|castle|ruins|building|archaeological_site)$"]'], Broar:['["man_made"="bridge"]["name"]'], 'Torg & promenadstråk':['["place"="square"]','["highway"="pedestrian"]["name"]'], Djurparker:['["tourism"~"^(zoo|aquarium)$"]'], Stränder:['["natural"="beach"]["name"]']
  }),
  def('Konserter','Musik & scen','Vilka scener?', {
    Alla:['["amenity"~"^(music_venue|theatre|arts_centre)$"]','["leisure"="music_venue"]'], Konsertlokaler:['["amenity"="music_venue"]','["leisure"="music_venue"]'], Teater:['["amenity"="theatre"]'], Opera:['["amenity"="theatre"]["theatre:type"="opera"]'], Kulturhus:['["amenity"="arts_centre"]'], Livemusik:['["live_music"="yes"]']
  }),
  def('Nattklubbar','Barer & klubb','Vilken typ av kväll?', {
    Alla:['["amenity"~"^(nightclub|bar|pub|biergarten)$"]'], Nattklubbar:['["amenity"="nightclub"]'], Barer:['["amenity"="bar"]'], Pubar:['["amenity"="pub"]'], Ölträdgårdar:['["amenity"="biergarten"]'], Livemusik:['["amenity"~"^(bar|pub|nightclub)$"]["live_music"="yes"]']
  })
];
export const boroughs = ['Hela New York','Manhattan','Brooklyn','Queens','Bronx','Staten Island'];
export const isNewYork = (city: string) => /^(new york( city)?|nyc)$/i.test(city.trim());
export function optionQueries(key: string, options: string[] = ['Alla']) {
  const cat = categoryDefinitions.find(c => c.key === key);
  if (!cat) return [];
  return [...new Set((!options.length || options.includes('Alla') ? ['Alla'] : options).flatMap(o => cat.queries[o] || []))];
}
// Only evaluates our fixed selectors, never user-authored query code.
export function matchesSelector(tags: Record<string,string>, selector: string) {
  return [...selector.matchAll(/\["([^"\]]+)"(?:(=|~|!~)"([^"\]]*)"(?:,(i))?)?\]/g)].every(([,key,op,value,flags]) => {
    if (!op) return !!tags[key];
    if (op === '=') return tags[key] === value;
    const match = new RegExp(value, flags || '').test(tags[key] || '');
    return op === '!~' ? !match : match;
  });
}
export function matchesCategory(tags: Record<string,string>, key: string, options = ['Alla']) { return optionQueries(key, options).some(q => matchesSelector(tags,q)); }
export type CatalogPlace = { mealTypes?: string[]; id: string; name: string; category: string; area: string; address: string; lat?: number; lon?: number; cuisine?: string; phone?: string; website?: string; openingHours?: string; details: string[]; source: string; updated?: string; visitMinutes?: number };
