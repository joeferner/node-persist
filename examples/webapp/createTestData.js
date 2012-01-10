
var persist = require("persist");
var models = require("./models");

persist.connect(function(err, connection) {
  if(err) { throw err; }

  var data = [];

  data.push(categorySocial = new models.Category({ name: "Social" }));
  data.push(categoryProgramming = new models.Category({ name: "Programming" }));
  data.push(categoryImage = new models.Category({ name: "Image" }));
  data.push(categoryAndroid = new models.Category({ name: "Android" }));

  data.push(keywordNodeJs = new models.Keyword({ name: "node.js" }));
  data.push(keywordLibwireshark = new models.Keyword({ name: "libwireshark" }));
  data.push(keywordImage = new models.Keyword({ name: "image" }));
  data.push(keywordTwitter = new models.Keyword({ name: "twitter" }));
  data.push(keywordAndroid = new models.Keyword({ name: "android" }));
  data.push(keywordMobile = new models.Keyword({ name: "mobile" }));

  data.push(new models.Blog({
    title: "How to use libwireshark to dissect a packet",
    body: "I've been doing some programming in node.js and needed a way to parse network packets. node-pcap just wasn't cutting it anymore so I figured why not use the best tool for the job, Wireshark. Under the covers Wireshark uses libwireshark. In fact libwireshark is also used by tshark and rawshark to dissect network packets. When you download the source for Wireshark you won't find a libwireshark directory, what you will find is an epan directory. This directory contains most of what you need to dissect packets.",
    category: categoryProgramming,
    keywords: [keywordNodeJs, keywordLibwireshark]
  }));

  data.push(new models.Blog({
    title: "How To Get The Most From Twitter: Scoping Rules",
    body: "Ever noticed a tweet disappear? As in someone else can't see something you posted? There's a common mistake even twitter pros make that causes this to occur. Are you sure you're seeing all of the replies to your tweets -- even from people you don't follow? Do you ever find yourself missing important posts -- like those from your real life friends? Do you know which will reach a wider audience: new style retweets vs old style retweets?",
    category: categorySocial,
    keywords: [keywordTwitter]
  }));

  data.push(new models.Blog({
    title: "Integral Image for Faster Image Processing",
    body: "Recently, I was looking into computer vision related technologies.  One of the interesting techniques is known as the integral image which can enable more advanced techniques, most notably the Viola-Jones object detection framework, which uses a series of simple, Haar-like features, which are rectangular areas with dark and light regions, to find areas that match patterns that correspond with the object you are trying to find.",
    category: categoryImage,
    keywords: [keywordImage]
  }));

  data.push(new models.Blog({
    title: "Promoting Software Craftsmanship",
    body: "Many people have tried to define software craftsmanship. Corey Haines likes to talk about being positive as part of your profession. Avdi Grimm, in the Confident Code talk he's been giving, talks similarly about how clean code is more enjoyable to work with. Bob Martin points out that nobody likes writing bad code.",
    category: categoryProgramming,
    keywords: []
  }));

  data.push(new models.Blog({
    title: "Android : Browsing your PC from your Phone",
    body: "If you are like me and have a lot of music, videos, and pictures stored on an external hard drive that you want to browse from your Android smartphone than you have a couple options. Some are expensive (a WIFI hard drive such as this one). Others require you to trust your data to the cloud which you may or may not be comfortable with. And still others are needlessly complicated (setting up your own FTP server was one suggestion I got).",
    category: categoryAndroid,
    keywords: [keywordAndroid, keywordMobile]
  }));

  connection.save(data, function(err) {
    if(err) { throw err; }
  });
});
