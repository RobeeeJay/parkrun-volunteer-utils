// Minimal puppeteer get page HTML source code example
const { promisify } = require("util");
const puppeteer = require("puppeteer");
const cheerio = require("cheerio");
const nodemailer = require("nodemailer");
require("dotenv").config();
const resultsPage = process.env.PARKRUN_RESTULTS;

function getRunnerData(runnerJqElement, milestone, isVolunteeringMilestone) {
    return {
        milestone,
        name: runnerJqElement.attr("data-name"),
        club: runnerJqElement.attr("data-club"),
        ageGroup: runnerJqElement.attr("data-agegroup"),
        gender: runnerJqElement.attr("data-gender"),
        position: runnerJqElement.attr("data-position"),
        runs: runnerJqElement.attr("data-runs"),
        volunteers: runnerJqElement.attr("data-vols"),
        agegrade: runnerJqElement.attr("data-agegrade"),
        achievement: runnerJqElement.attr("data-achievement"),
        volunteering: !!isVolunteeringMilestone
    };
}

function getNextSaturday() {
    const now = new Date();
  
    const nextSaturday = new Date(
        now.setDate(
            now.getDate() + ((7 - now.getDay() + 6) % 7 || 7),
      ),
    );
  
    return nextSaturday;
  }

(async () => {
    console.log(`Attempting to calculate milestones for "${resultsPage}"`);

    const browser = await puppeteer.launch();
    const page = await browser.newPage();
    await page.setUserAgent("Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:100.0) Gecko/20100101 Firefox/100.0");
    console.log("Retrieving webpage");
    await page.goto(resultsPage, { waitUntil: "domcontentloaded" });

    console.log("Loading content");
    const latestResultsPage = await page.content();
    console.log("Parsing content");
    const $ = cheerio.load(latestResultsPage);

    console.log("Iterating parkrunners");

    const runners = [];
    $("tr.Results-table-row").each(function () {
        const runner = $(this);
        const completedRuns = parseInt(runner.attr("data-runs"), 10);

        if (completedRuns == 24) {
            runners.push(getRunnerData(runner, "25th Parkrun"));
        }
        else if ((completedRuns + 1) % 50 == 0) {
            runners.push(getRunnerData(runner, `${(completedRuns + 1)}th Parkrun`));
        }

        const volunteerCount = parseInt(runner.attr("data-vols"), 10);

        if (volunteerCount == 24) {
            runners.push(getRunnerData(runner, "Possibly 25th Time Volunteering", true));
        }
        else if ((volunteerCount + 1) % 50 == 0) {
            runners.push(getRunnerData(runner, `Possibly ${(volunteerCount + 1)}th Time Volunteering`, true));
        }
    });

    // create reusable transporter object using the default SMTP transport
    const transporter = nodemailer.createTransport({
        host: process.env.MAIL_SERVER,
        port: process.env.MAIL_SERVER_PORT,
        secure: false,
        requireTLS: true,
        auth: {
            user: process.env.MAIL_SERVER_USERNAME,
            pass: process.env.MAIL_SERVER_PASSWORD
        }
    });

    // Find next Saturday
    const nextSaturday = getNextSaturday();

    // Build message
    let milestoneText = `List of Possible Milestones for ${ nextSaturday.toDateString() }:\n\n`;

    runners.sort((a, b) => {
        if (a.volunteering && !b.volunteering)
            return 1;
        else if (!a.volunteering && b.volunteering)
            return -1;
        else if (a.volunteering) {
            // Okay so both are volunteers, compare that asc

            return a.volunteers - b.volunteers;
        }

        // Not volunteering so sort by runs asc
        return (a.runs - b.runs)
    }).forEach((runner) => {
        milestoneText += `${ runner.name } (${ runner.gender } ${ runner.ageGroup })\n${ runner.milestone } - (${ runner.runs } runs, ${ runner.volunteers } volunteers as of last week)\n\n`;
    });

    milestoneText += "\nEND OF LIST";

    const message = {
        from: process.env.MAIL_FROM,
        to: process.env.MAIL_TO,
        subject: `Parkrun milestones for ${ nextSaturday.getDate() }/${ nextSaturday.getMonth() + 1 }/${ nextSaturday.getFullYear() }`,
        text: milestoneText
    };

    console.log("Sending email");
    await transporter.sendMail(message);
    console.log("Sent!");

    await browser.close();
})();
