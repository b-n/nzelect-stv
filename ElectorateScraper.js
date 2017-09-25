import fetch from 'node-fetch';
import domutils from 'domutils';
import htmlparser from 'htmlparser2';

export default class ElectorateScraper {

    constructor(index) {
        this.electorateId = index;
        this.parser = new htmlparser.Parser(new htmlparser.DomHandler(this.domHandler.bind(this)));
    }

    domHandler(error, dom) {
        const pageBody = domutils.findOne(elem => elem.type == 'tag' && elem.attribs && elem.attribs.id == 'body', dom);
        const electorateTitleElem = domutils.findOne(elem => elem.type == 'tag' && elem.name == 'h2', pageBody.children);

        const summaryTableElem = domutils.findOne(elem => elem.type == 'tag' && elem.attribs && elem.attribs.id == 'electorate_details_table', pageBody.children);
        const votesCountedRow = domutils.findOne(elem => elem.type == 'tag' && elem.name == 'tr', summaryTableElem.children);
        const votesCountedData = domutils.find(elem => elem.type == 'tag' && elem.name == 'div', votesCountedRow.children, true, 999)
            .reduce((accumulator, item, index) => {
                const stat = index == 1 ? 'total' : (index == 2 ? 'percent' : '');
                return stat
                    ? { ...accumulator, [stat]: item.children[0].data.trim() }
                    : accumulator;
            }, {});

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
                        candidateVotes: parseInt(dataPoints[1].replace(/,/g, '')),
                        partyName: dataPoints[2],
                        partyVotes: parseFloat(dataPoints[3].replace(/,/g, ''))
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
            id: this.electorateId,
            name: electorateTitleElem.children[0].data.split('-')[0].trim(),
            seat,
            list,
            votesCounted: parseInt(votesCountedData.total.replace(/,/g, '')),
            votesCountedPercent: votesCountedData.percent
        };
    }

    scrapeElectorate(index) {
        const electorateNumber = ("0" + this.electorateId).slice(-2);
        return fetch('http://www.electionresults.govt.nz/electorate-details-' + electorateNumber + '.html')
            .then(res => res.text())
            .then(res => {
                this.parser.parseComplete(res);
                return this.data;
            });
    }
}
