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
    PLACEHOLDER: "placeholder",
    // A YouTube <iframe> (video or playlist) embedded directly inside the
    // frame's content area via a Phaser DOM Element — see
    // TakeoverFrameScene.renderYouTubeEmbed. Needs `embedUrl` (the full
    // youtube.com/embed/... URL) and optionally `caption`.
    YOUTUBE_EMBED: "youtube-embed"
};

export default ContentType;