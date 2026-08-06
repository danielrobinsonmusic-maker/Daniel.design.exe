const ContentType = {
    PDF: "pdf",
    IMAGE: "image",
    GALLERY: "gallery",
    VIDEO: "video",
    LINK: "link",
    TEXT: "text",
    CONTACT: "contact",
    // Generic "coming soon" content with no defined future shape yet (a
    // specific message, nothing more) — distinct from GALLERY, which
    // implies a folder of images will eventually back it.
    PLACEHOLDER: "placeholder"
};

export default ContentType;