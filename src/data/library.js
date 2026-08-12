import ContentType from "./contentTypes";
const library = [
    {
        id: "resume",
        title: "Resume (PDF)",
        type: ContentType.PDF,
        file: "DanielRobinson_Resume.pdf"
    },
    {
        id: "resume-web",
        title: "Resume (Web)",
        type: ContentType.TEXT,
        content: [
            "[Placeholder — replace via src/data/library.js]",
            "",
            "This is where your web-readable resume will live.",
            "Add your experience, skills, and background here so it",
            "renders directly in the Library without opening a PDF."
        ].join("\n")
    },
    {
        id: "writing",
        title: "Writing Samples",
        type: ContentType.PDF_GALLERY,
        // Relative to public/assets/ — same convention as GALLERY's own
        // `folder` (TakeoverFrameScene.renderPdfGallery builds each
        // preview's load URL as `assets/${folder}/${file}`).
        folder: "documents/writing",
        // A static site has no way to list a folder's contents at
        // runtime, so — same as every other content list in this project
        // — this is a hand-authored, pre-sorted (alphabetical,
        // case-insensitive) filename list rather than something
        // discovered on the fly.
        files: [
            "Alternative_Broadcasts.pdf",
            "Multiview_.pdf",
            "Podcast_Chapters.pdf",
            "Real-Time_Voting.pdf"
        ]
    },
    {
        id: "portfolio",
        title: "Portfolio",
        type: ContentType.PDF_GALLERY,
        // Capital "Portfolio" matches the actual folder name on disk
        // (case-sensitive on the static host this deploys to, even though
        // it resolves either way locally on a case-insensitive filesystem
        // — same gotcha as the Workshop's "Computer" folder/News's own).
        folder: "documents/Portfolio",
        files: [
            "Moments on Netflix.pdf",
            "Netflix Live Waiting Room Framework.pdf",
            "Real-time Voting.pdf"
        ],
        // Shown as a final "page" once the player has browsed past the
        // last real document (see TakeoverFrameScene's
        // renderPdfGalleryItem/displayPdfGalleryOutro) — reachable by
        // continuing to click "next" past the 3rd file, same as any other
        // page in this same browsing carousel.
        outro: "For more information and details on these case studies, as well as a full portfolio to browse, visit danielrobinson.design"
    },
    {
        id: "news",
        title: "News and Featured Work",
        type: ContentType.CARD_CAROUSEL,
        // Relative to public/assets/ — used by the "image" items below
        // (TakeoverFrameScene.renderCarouselImage builds each one's load
        // URL as `assets/${folder}/${file}`); the "card" items don't need
        // it, they're inline text.
        // Capital "News" matches the actual folder name on disk
        // (case-sensitive on the static host this deploys to, even though
        // it resolves either way locally on a case-insensitive filesystem
        // — same gotcha as the Workshop's "Computer" folder).
        folder: "images/News",
        // Grouped by feature, in this order — each card independently
        // carries its own feature/quote/source (adjacent cards in the same
        // group repeat the feature name rather than sharing a "sticky"
        // header) per the content spec this was populated from. "image"
        // items are mixed in at random positions between them (fixed here
        // rather than shuffled at runtime, so the layout doesn't reshuffle
        // every time the book is reopened in the same session — same
        // "deterministic, not Math.random()" reasoning the world map's own
        // scatter/variety uses, just applied to content order instead of
        // tile art) — each takes up a single page, centered, rather than
        // flowing across the spread like a card's text does. See
        // TakeoverFrameScene.renderCardItem's type dispatch.
        items: [
            {
                type: "card",
                feature: "Moments & Clips",
                quote: `"Netflix's new update to the 'Moments' feature is looking to capitalize on viral moments in shows such as 'Wednesday.' The update includes a 'clip' option on the screen to adjust the length of a segment. After it's clipped, the video will save to viewers' 'My Netflix' tab for rewatching or sharing. At its heart, this feature is about giving members the ability to celebrate and share their favorite stories while curating an experience that feels uniquely their own."`,
                source: "CNBC"
            },
            { type: "image", file: "IMG_1103.jpeg" },
            {
                type: "card",
                feature: "Moments & Clips",
                quote: `"Netflix has announced a big redesign for its mobile app, unveiling a new 'Clips' feature that will remind users of TikTok, Instagram Reels, YouTube Shorts, and every other social media app that offers a feed of short-form vertical videos... Netflix isn't looking to replace TikTok with the new Clips feature, but it is competing for users' attention in those moments when quick social media scrolling might scratch an itch that the regular mobile Netflix experience can't."`,
                source: "BGR"
            },
            { type: "image", file: "IMG_1101.jpeg" },
            {
                type: "card",
                feature: "Moments & Clips",
                quote: `"This update coincides with the release of Part 2 of the second season of 'Wednesday.' Launching the Moments update alongside the hit series, which will feature Lady Gaga as a guest star, will likely generate excitement for the show and encourage fans to share scenes on social media. According to the company, members have used Moments across thousands of titles."`,
                source: "TechCrunch"
            },
            { type: "image", file: "IMG_1102.jpeg" },
            { type: "image", file: "IMG_1100.jpeg" },
            {
                type: "card",
                feature: "Real-time Voting",
                quote: `"Netflix is always adding new shows and movies, which is what most users are looking for in the platform, but that's not all you can expect from your account. In fact, Netflix is now rolling out an interactive experience for its live competition shows, allowing subscribers to cast votes in real-time."`,
                source: "LifeHacker"
            },
            {
                type: "card",
                feature: "Real-time Voting",
                quote: `"I have my 86-year-old father, who is so excited to be voting, to get to be a part of something like this. He feels so a part of every show we get to do. He feels like he is in the room with us."`,
                source: "Chrissy Teigen, Forbes"
            },
            {
                type: "card",
                feature: "Real-time Voting",
                quote: `"For the first time in its history, Netflix will let its audience decide the outcome of a show with live voting. However, unlike how shows have done this in the past, audiences won't have to send text messages or call a special number to make their votes count. Instead, viewers will vote with their TV's remote control, or right within the Netflix app if they watch the show on their phones."`,
                source: "FastCompany"
            },
            {
                type: "card",
                feature: "Real-time Voting",
                quote: `"This New Tech Feature Could Change How People Use Netflix"`,
                source: "Inc."
            },
            {
                type: "card",
                feature: "Real-time Voting",
                quote: `"Netflix has launched a new feature that will enable viewers to interact with live content while they're watching. Starting on Jan. 20, viewers can now pick an option from a multiple-choice menu and rate someone's performance on a scale of five stars. To cast a vote, anyone can use the Netflix app or a TV remote."`,
                source: "Complex"
            },
            { type: "image", file: "IMG_1104.jpeg" },
            {
                type: "card",
                feature: "Meta Portal Story Time",
                quote: `"If you like to have video calls with the little kids in your life, the Story Time feature will be your new favorite thing. It basically lets you tell a story using story filters and onscreen prompts. Story choices include The Three Little Pigs, The Itsy-Bitsy Spider and Mary Had a Little Lamb."`,
                source: "CNET"
            },
            {
                type: "card",
                feature: "Paul vs. Tyson Waiting Room",
                quote: `"Friday's highly anticipated boxing match between former heavyweight champion Mike Tyson and YouTuber-turned-boxer Jake Paul will be remembered for more than its unique card. The bout shown on Netflix was the most-streamed global sporting event ever with 65 million live concurrent streams and 108 million total live viewers around the world... The Amanda Serrano and Katie Taylor fight before the Tyson-Paul match averaged 74 million live global viewers, the most-watched professional women's sporting event ever in the U.S. with 47 million viewers, the company said."`,
                source: "CNBC"
            },
            { type: "image", file: "IMG_1099.jpeg" }
        ]
    },
    {
        id: "design",
        title: "Design Philosophy",
        type: ContentType.TEXT,
        content: [
            "[Placeholder — replace via src/data/library.js]",
            "",
            "This is where a short statement of your design philosophy",
            "will appear once you write it."
        ].join("\n")
    },
    {
        id: "childrens-book",
        title: "Children's Book",
        type: ContentType.GALLERY,
        folder: "childrens-book"
    },
    {
        id: "contact",
        title: "Contact",
        type: ContentType.CONTACT,
        content: [
            "[Placeholder — replace via src/data/library.js]",
            "",
            "Email:    your-email@example.com",
            "LinkedIn: linkedin.com/in/your-handle",
            "GitHub:   github.com/your-handle"
        ].join("\n")
    }
];

export default library;
