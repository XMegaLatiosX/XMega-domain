// NAV
document.getElementById('logo_icon').addEventListener('click', () => {window.location = "index.html"});
document.getElementById('side_tab_button').addEventListener('click', () => {side_bar_interaction()});


function side_bar_interaction() {
    const sidebar_div = document.getElementById('sidebar_div');
    sidebar_div.classList.toggle('open');

    
    const news = document.createElement('a');


    const progress = document.createElement('a');
    const about = document.createElement('a');

    const error = document.createElement('a');



    const support_me = document.createElement('a');
    
    const configurations = document.createElement('a');

    const bug_report_button = document.createElement('a');
    const feedback_button = document.createElement('a');
    
    const discord_social_icon = document.createElement('a');
    const instagram_social_icon = document.createElement('a');
    const social_icon = document.createElement('a');

    const social_link_div = document.createElement('div');

    social_link_div.appendChild(discord_social_icon);
    social_link_div.appendChild(instagram_social_icon);
    social_link_div.appendChild(social_icon);

    news.className = "sidebar_button";
    progress.className = "sidebar_button";
    about.className = "sidebar_button";
    error.className = "sidebar_button";
    support_me.className = "sidebar_button";
    configurations.className = "sidebar_button";
    bug_report_button.className = "sidebar_button";
    feedback_button.className = "sidebar_button";

    sidebar_div.appendChild(news);
    sidebar_div.appendChild(progress);
    sidebar_div.appendChild(about);
    sidebar_div.appendChild(error);
    sidebar_div.appendChild(support_me);
    sidebar_div.appendChild(configurations);
    sidebar_div.appendChild(bug_report_button);
    sidebar_div.appendChild(feedback_button);
    sidebar_div.appendChild(social_link_div);
}

// contact me 
//