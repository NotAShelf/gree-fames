const request = require('request');
const FeedParser = require('feedparser');
const { WebhookClient, EmbedBuilder, Embed } = require('discord.js');
const { post } = require('request');
const config = require('./config.json')
const webhook = new WebhookClient({id: config.webhook.id, token: config.webhook.token});

// Per-platform colors 
const colors = {
    steam: config.colors.steam,
    epic: config.colors.epic,
    gog: config.colors.gog,
    uplay: config.colors.uplay,
    origin: config.colors.origin,
    humble: config.colors.humble,
    itch: config.colors.itch,
    unknown: config.colors.unknown
};

function getPosts(url) {
    return new Promise((resolve, reject) => {
      const req = request(url);
      const feedparser = new FeedParser();
      const posts = [];
  
      req.on('error', reject);
      req.on('response', function (res) {
        if (res.statusCode !== 200) {
          return this.emit('error', new Error('Bad status code'));
        }
        this.pipe(feedparser);
      });
  
      feedparser.on('error', reject);
      feedparser.on('readable', function () {
        let item;
        while ((item = this.read())) {
          posts.push(item);
        }
      });
      feedparser.on('end', () => resolve(posts));
    });
  }

function isGree(post) {
    return (post.title.includes("FREE") || post.title.includes("100%"))
}

  const rssUrl = `https://www.reddit.com/${config.subreddit}/.rss`;
  let previousTitles = [];
  
  setInterval(() => {
    getPosts(rssUrl)
      .then((posts) => {
        const newPosts = posts.filter((post) => !previousTitles.includes(post.title));
        let newTitles = [];
        newPosts.forEach(post => {
            newTitles.push(post.title);
            console.log(`${post.title}: ${isGree(post)}`);
        });
        previousTitles = [...previousTitles, ...newTitles];

        newPosts.forEach((post) => {
            if (isGree(post)) {
                sendEmbed(post, webhook);
                console.log(post);
            }
        });
      })
      .catch((error) => {
        console.error(error);
      });
  }, 60000); // run every 60 seconds TODO: make this configurable
  
function sendEmbed(post, webhook) {

    const platform = post.title.split(" ")[0].replace("[", "").replace("]", "").toLowerCase();
    const color = colors[platform] || colors.unknown;

    // Create a new embed
    const embed = new EmbedBuilder()
      .setTitle(post.title)
      .setColor(color)
    if (post.link != undefined)
        embed.setURL(post.link)
    if (post.image.url != undefined)
        embed.setImage(post.image.url)
    

    // Send the embed to the webhook
    webhook.send({embeds:[embed]});
}