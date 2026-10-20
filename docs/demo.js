// Deliberately fictional progress over curated sample achievements, never a Steam account.
const specs = [
  [1145360, 'Hades', 'Roguelike', 12420, 10, ['Escaped Tartarus','Escaped Asphodel','Escaped Elysium','Is There No Escape?','Weapon of Fate','To Charon’s Credit','The Family Secret','Well Stocked','Back to Work','Something From Everyone','One for the Ages','Friends Forever']],
  [367520, 'Hollow Knight', 'Metroidvania', 4960, 9, ['Charmed','Enchanted','Blessed','Protected','Soulful','Illumination','Falsehood','Test of Resolve','Neglect','Pure Completion','Embrace the Void','Steel Heart']],
  [504230, 'Celeste', 'Platformer', 1820, 10, ['Forsaken','Archaeology','Checking Out','Breathe','In the Mirror','Reflection','Celeste','Strawberry Badge','Strawberry Medal','Heart of the Mountain','Farewell','Impress Your Friends']],
  [1332010, 'Stray', 'Adventure', 620, 10, ['Missed Jump','Not Alone','Cat Got Your Tongue?','Catwalk','Al-Cat-Raz','Eye Opener','Meowlody','Curiosity Killed the Cat','Cat-a-strophe','Sneakitty','I am Speed','Can’t Cat-ch Me']],
  [1245620, 'ELDEN RING', 'Action RPG', 8430, 8, ['Roundtable Hold','Great Rune','Erdtree Aflame','Godrick the Grafted','Rennala, Queen of the Full Moon','Shardbearer Radahn','Shardbearer Morgott','Legendary Armaments','Malenia, Blade of Miquella','Elden Lord','Age of the Stars','Lord of Frenzied Flame']],
  [413150, 'Stardew Valley', 'Life sim', 14340, 6, ['Greenhorn','Cowpoke','Homesteader','Millionaire','A New Friend','Best Friends','The Beloved Farmer','The Bottom','Local Legend','Master Angler','Craft Master','Full Shipment']],
  [620, 'Portal 2', 'Puzzle', 1630, 12, ['Wake Up Call','You Monster','Undiscouraged','Bridge Over Troubling Water','SaBOTour','Stalemate Associate','Vertically Unchallenged','Tater Tote','The Part Where He Kills You','Lunacy','Professor Portal','You Saved Science']],
  [383870, 'Firewatch', 'Adventure', 410, 12, ['Good First Day','Back to Work','Someone’s Out Here','Burn the Place Down','Firewatch','Shutter Bug','Squirrel Tactics','Love Turts','The Life and Times of Raccoon Carter','Ol’ Shoshone','A Walk in the Woods','A Job Well Done']]
];
const descriptions = {
  'One for the Ages': 'Reach the epilogue of the story.', 'Friends Forever': 'Forge a bond with each of the companions.',
  'Farewell': 'Complete Chapter 9.', 'Impress Your Friends': 'Collect every golden strawberry.',
  'I am Speed': 'Complete the game in under two hours.', 'Can’t Cat-ch Me': 'Complete the first Zurk pursuit without being caught.',
  'Pure Completion': 'Achieve 112% game completion and finish the game.', 'Embrace the Void': 'Ascend the Pantheon of Hallownest.', 'Steel Heart': 'Achieve 100% game completion and finish Steel Soul mode.',
  'Malenia, Blade of Miquella': 'Defeat Malenia, Blade of Miquella.', 'Master Angler': 'Catch every fish.', 'Craft Master': 'Craft every item.', 'Full Shipment': 'Ship every item.'
};
export const demo = {
  mode: 'demo', profile: { id: 'demo', name: 'Player one' }, fetchedAt: null,
  games: specs.map(([id,name,genre,minutes,count,names], gameIndex) => {
    const achievements = names.map((name,i) => ({ id: `sample-${i}`, name, description: descriptions[name] || 'An illustrative milestone from this game. Explore with your own profile for Steam’s full achievement list.', unlocked: i<count, unlockedAt: i<count ? Math.floor(Date.now()/1000) - ((gameIndex*3+i)%30)*86400 - i*3600 : 0, hidden: false, rarity: Math.max(1.2, 76-i*5.7-gameIndex*2) }));
    return { id,name,genre,minutes,status:'ready',total:names.length,unlocked:count,percent:Math.round(count/names.length*100),lastPlayed: 1792400000-gameIndex*86400,achievements };
  })
};
