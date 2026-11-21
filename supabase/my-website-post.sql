-- Blog post: "my website" (short tour; the full details live in the project /projects/website-documentation).
-- Paste into Supabase > SQL Editor > Run. Safe to run again: it replaces the post with url_slug 'my-website'.
-- To edit it later use the blog editor (the thumbnail below is an existing image in blog_media).
-- To remove it:  delete from public.blog_posts where url_slug = 'my-website';

delete from public.blog_posts where url_slug = 'my-website';

insert into public.blog_posts (id, slug, url_slug, title, icon, thumbnail, summary, content) values
(
    gen_random_uuid(),
    'my website',
    'my-website',
    'my website is finished',
    '/media/images/star_icon.png',
    'https://fwldimnufoblhdsflkrm.supabase.co/storage/v1/object/public/blog_media/fc7866f3-c892-427f-a2f6-2541995686db/thumbnail.png',
    'I finished my website! It listens to music and moves with it, and it holds everything I do. A quick tour, with a link to the full documentation.',
    $content$[
    {
        "type": "embed",
        "value": "<div style=\"text-align:left;font-weight:400;line-height:1.7\"><p>I finished my website!<br>It took way longer than I thought it would...<br>but I'm not even mad, because it turned into something I'm proud of.</p><p style=\"margin-top:.8rem\">This post is the quick version. If you want the technical part and how exactly everything works you can check the <a style=\"color:#22d3ee;text-decoration:underline\" href=\"/projects/website-documentation\"><b>Full documentation here</b></a>.</p></div>"
    },
    {
        "type": "embed",
        "value": "<div style=\"text-align:left;font-weight:400;line-height:1.7\"><div style=\"font-size:1.35rem;font-weight:700;color:#67e8f9;margin:0 0 .5rem\"><br>The Visualizer</div><p>The home page has a music visualizer.<br>Play something in this tab with the search bar (soundcloud and youtube only for now), share that tab's audio, and the site hears 24 band frequency, with said frequency it finds the <b>kicks, snares and hats</b>, guesses the BPM.</p><p style=\"margin-top:.8rem\">When the music breaks, builds up and DROPS, the whole website goes with it. </p><p style=\"margin-top:.8rem\">You can turn everything down or off in the settings, and there are 3 performance levels so it still runs on a weaker computer or mobile.</p><p style=\"margin-top:.8rem\"><small style=\"opacity:.7\">Heads up: hearing a tab's audio only works on desktop Chrome/Edge. On mobile the site can't hear the music, so it plays steady patterns with the bpm you tap on the logo or music player tab.</small></p></div>"
    },
    {
        "type": "embed",
        "value": "<div style=\"text-align:left;font-weight:400;line-height:1.7\"><div style=\"font-size:1.35rem;font-weight:700;color:#67e8f9;margin:0 0 .5rem\">The rest of the site</div><p>Besides the visualizer, there's a place for everything I care about:</p><ul style=\"list-style:disc;padding-left:1.4rem;margin-top:.5rem\"><li><a style=\"color:#22d3ee;text-decoration:underline\" href=\"/projects\">Projects</a>: what I'm building and how far along it is.</li><li><a style=\"color:#22d3ee;text-decoration:underline\" href=\"/self-improvement/mega\">Self improvement</a>: my skill tracker. You can track yours too!</li><li><a style=\"color:#22d3ee;text-decoration:underline\" href=\"/music\">Music</a>: some of my tracks (maybe one of yours if you're interested 👀).</li><li>This blog, where I briefly talk about what I'm doing.</li><li><a style=\"color:#22d3ee;text-decoration:underline\" href=\"/mural\">The mural</a>, a guestbook, plus a live chat on the home page!</li></ul></div>"
    },
    {
        "type": "embed",
        "value": "<div style=\"text-align:left;font-weight:400;line-height:1.7\"><div style=\"font-size:1.35rem;font-weight:700;color:#67e8f9;margin:0 0 .5rem\">Why I made it</div><p>I can't handle the algorithm of social media, and I didn't want to hide what I do anymore.<br>I wanted a place to bring everything together, without caring about numbers.</p><p style=\"margin-top:.8rem\">A place where I can challenge myself, have a public commitment and, even better, <b>track my progress</b>.<br>So this isn't just a portfolio. It's my excuse to create, and my way to get better at everything I do.</p><p style=\"margin-top:.8rem\">I also build websites for artists and small businesses, and this one is the biggest proof of what I can do.</p></div>"
    },
    {
        "type": "embed",
        "value": "<div style=\"text-align:left;font-weight:400;line-height:1.7\"><div style=\"font-size:1.35rem;font-weight:700;color:#67e8f9;margin:0 0 .5rem\">How it works, in full</div><p>There's a LOT going on under the hood: how it splits sound into 24 bands, how it decides what's a kick, how it keeps the beat when the music gets confusing, how drops are found, and each one of its 89 settings.<br>I wrote everything down like a small wiki, with a contents list on the side.</p><p style=\"margin-top:.8rem\">👉 <a style=\"color:#22d3ee;text-decoration:underline\" href=\"/projects/website-documentation\"><b>Read the documentation</b></a></p></div>"
    },
    {
        "type": "embed",
        "value": "<div style=\"text-align:left;font-weight:400;line-height:1.7\"><div style=\"font-size:1.35rem;font-weight:700;color:#67e8f9;margin:0 0 .5rem\">Say hi!</div><p>If you came this far, thank you, for real.<br>Please leave a message on the <a style=\"color:#22d3ee;text-decoration:underline\" href=\"/mural\">mural</a>, I'd love to keep it as a memory. If you create an account you can pick your nickname color and have a profile picture.</p><p style=\"margin-top:.8rem\">And if you have ideas or find something broken, the <a style=\"color:#22d3ee;text-decoration:underline\" href=\"/feedback\">feedback</a> page is the place!</p></div>"
    }
]$content$::jsonb
);
