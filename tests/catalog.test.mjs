import test from 'node:test';
import assert from 'node:assert/strict';
import { categoryDefinitions, optionQueries, matchesCategory, isNewYork, foodTerms } from '../app/catalog.ts';
test('every displayed detailed choice maps to a real search',()=>{
  assert.ok(categoryDefinitions.length>=9);
  for(const category of categoryDefinitions)for(const choice of category.options)assert.ok(optionQueries(category.key,[choice]).length,`${category.key}: ${choice}`);
  for(const choice of categoryDefinitions[0].options.filter(o=>o!=='Alla'))assert.ok(foodTerms[choice]?.length,choice);
});
test('clothing subtype does not confuse menswear with womenswear',()=>{
  assert.equal(matchesCategory({shop:'clothes',clothes:'women'},'Klädbutiker',['Herr']),false);
  assert.equal(matchesCategory({shop:'clothes',clothes:'men;women'},'Klädbutiker',['Herr']),true);
});
test('detailed shop and sightseeing choices discriminate correctly',()=>{
  assert.equal(matchesCategory({shop:'music'},'Butiker',['Skivor & vinyl']),true);
  assert.equal(matchesCategory({shop:'books'},'Butiker',['Skivor & vinyl']),false);
  assert.equal(matchesCategory({leisure:'park'},'Sevärdheter',['Parker']),true);
  assert.equal(matchesCategory({tourism:'museum'},'Sevärdheter',['Parker']),false);
  assert.equal(matchesCategory({shop:'vacant'},'Butiker',['Alla']),false);
});
test('New York aliases use the official restaurant catalogue',()=>{
  for(const city of ['New York','NYC','New York City'])assert.equal(isNewYork(city),true);
  assert.equal(isNewYork('York'),false);
});
