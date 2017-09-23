import 'babel-polyfill';
import domutils from 'domutils';
import htmlparser from 'htmlparser2';
import fetch from 'node-fetch';
import jsonfile from 'jsonfile';

class ElectorateScraper {

    domHandler(error, dom) {
        const pageBody = domutils.findOne(elem => elem.type == 'tag' && elem.attribs && elem.attribs.id == 'body', dom);
        const electorateTitleElem = domutils.findOne(elem => elem.type == 'tag' && elem.name == 'h2', pageBody.children);
        const table = domutils.findOne(elem => elem.attribs && elem.attribs.id == 'partyCandidatesResultsTable', pageBody.children);
        const rows = domutils
            .find(elem => elem.type == 'tag' && elem.name  == 'tr', table.children, true, 999)
            .reduce((accumulator, currentIndex) => {
                const dataPoints = domutils
                    .find(elem => elem.type == 'tag' && elem.name == 'span', currentIndex.children, true, 4)
                    .map(elem => elem.children && elem.children[0] && elem.children[0].data ? elem.children[0].data : '');

                return dataPoints.length != 4
                    ? accumulator
                    : accumulator.concat({
                        candidateName: dataPoints[0],
                        candidateVotes: dataPoints[1],
                        partyName: dataPoints[2],
                        partyVotes: dataPoints[3]
                    });
            }, []);

        const seat = rows.reduce((accumulator, currentIndex) => {
            const { candidateName, candidateVotes, partyName } = currentIndex;
            return candidateName == ''
                ? accumulator
                : accumulator.concat({
                    name: candidateName,
                    votes: candidateVotes,
                    party: partyName
                });
        }, []);

        const list = rows.reduce((accumulator, currentIndex) => {
            const { partyName, partyVotes } = currentIndex;
            return partyName == ''
                ? accumulator
                : accumulator.concat({
                    name: partyName,
                    votes: partyVotes
                });
        }, []);

        this.data = {
            name: electorateTitleElem.children[0].data.split('-')[0].trim(),
            seat,
            list
        };
    }

    scrapeElectorate(index) {
        const parser = new htmlparser.Parser(new htmlparser.DomHandler(this.domHandler.bind(this)));

        const electorateNumber = ("0" + index).slice(-2);

        return fetch('http://www.electionresults.govt.nz/electorate-details-' + electorateNumber + '.html')
            .then(res => res.text())
            .then(res => {
                parser.parseComplete(res);
                return this.data;
            });
    }

    scrapeAll() {
        const promises = [];
        for (let i = 0; i < 71; i++) {
            promises.push(this.scrapeElectorate(i+1));
        }

        return Promise.all(promises)
    }
}

const scraper = new ElectorateScraper();
scraper.scrapeAll()
    .then(results => jsonfile.writeFile('output.json', results));
