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
}

// contact me 
//