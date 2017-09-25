import 'babel-polyfill';
import jsonfile from 'jsonfile';
import ElectorateScraper from './electorateScraper.js';

const scrapePromises = [];
for (let i = 0; i < 71; i++) {
    const scraper = new ElectorateScraper(i+1);
    scrapePromises.push(scraper.scrapeElectorate(i+1));
}

Promise.all(scrapePromises)
    .then(results => jsonfile.writeFile('output.json', results));



