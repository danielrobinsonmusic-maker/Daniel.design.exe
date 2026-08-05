import ContentType from "./contentTypes";
const library = [
    {
        id: "resume",
        title: "Resume (PDF)",
        type: ContentType.PDF,
        file: "resume.pdf"
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
        type: ContentType.PDF,
        file: "writing-samples.pdf"
    },
    {
        id: "case-studies",
        title: "Case Studies",
        type: ContentType.GALLERY,
        folder: "case-studies"
    },
    {
        id: "news",
        title: "News and Featured Work",
        type: ContentType.GALLERY,
        folder: "news"
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
