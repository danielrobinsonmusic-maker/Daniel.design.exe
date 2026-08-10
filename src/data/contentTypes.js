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
    YOUTUBE_EMBED: "youtube-embed",
    // A set of local video files played back to back, looping the whole
    // set once the last one finishes, via a Phaser Video GameObject — see
    // TakeoverFrameScene.renderVideoPlaylist. Needs `videos` (an ordered
    // array of file paths).
    VIDEO_PLAYLIST: "video-playlist",
    // A folder of local video files browsed one at a time via prev/next
    // arrows (not autoplayed back to back like VIDEO_PLAYLIST) — see
    // TakeoverFrameScene.renderVideoGallery. Same `folder`/`files` shape
    // as GALLERY, just video files instead of images; each one loops
    // while showing, with its filename overlaid and fading out.
    VIDEO_GALLERY: "video-gallery",
    // A set of quote/attribution cards browsed one at a time via the same
    // prev/next arrows as GALLERY/VIDEO_GALLERY — see
    // TakeoverFrameScene.renderCardCarousel. Needs `cards`, an ordered
    // array of { feature, quote, source }; any card whose text is taller
    // than the visible area scrolls via its own up/down arrows (same
    // behavior as AdventureBar's dialogue-panel scroll).
    CARD_CAROUSEL: "card-carousel"
};

export default ContentType;