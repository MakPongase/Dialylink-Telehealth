export interface Province {
  name: string;
  cities: {
    name: string;
    barangays: string[];
  }[];
}

export const phLocations: Province[] = [
  {
    name: 'Bulacan',
    cities: [
      {
        name: 'Baliwag',
        barangays: ['Poblacion', 'Bagong Nayon', 'Concepcion', 'Subic', 'Tibag', 'Pagala']
      },
      {
        name: 'Malolos',
        barangays: ['Catmon', 'San Gabriel', 'Guinhawa', 'Sumapang Bata', 'Lugam']
      },
      {
        name: 'Meycauayan',
        barangays: ['Bancal', 'Calvario', 'Hulo', 'Saluysoy', 'Tugatog']
      }
    ]
  },
  {
    name: 'Metro Manila',
    cities: [
      {
        name: 'Quezon City',
        barangays: ['Bagong Pag-asa', 'Diliman', 'Socorro', 'Kamuning', 'Loyola Heights']
      },
      {
        name: 'Manila',
        barangays: ['Binondo', 'Ermita', 'Malate', 'Intramuros', 'Quiapo', 'Sampaloc']
      },
      {
        name: 'Makati',
        barangays: ['Bel-Air', 'Poblacion', 'San Lorenzo', 'Guadalupe Nuevo', 'Urdaneta']
      }
    ]
  },
  {
    name: 'Cebu',
    cities: [
      {
        name: 'Cebu City',
        barangays: ['Lahug', 'Mabolo', 'Banilad', 'Guadalupe', 'Capitol Site']
      },
      {
        name: 'Mandaue',
        barangays: ['Centro', 'Subangdaku', 'Banilad', 'Bakilid', 'Tipolo']
      }
    ]
  }
];
