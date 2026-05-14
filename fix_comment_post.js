const fs = require('fs');
const content = fs.readFileSync('src/routes.js', 'utf8');
const lines = content.split('\n');

// "const channel = db.prepare" satirini bul
let channelLine = -1;
for (let i = 0; i < lines.length; i++) {
  if (lines[i].includes("const channel = db.prepare('SELECT user_id FROM channels WHERE id = ?').get(video.channel_id)")) {
    channelLine = i;
    console.log('Channel satiri:', i+1, ':', lines[i].substring(0, 80));
    break;
  }
}

if (channelLine === -1) {
  console.log('Bulunamadi, alternatif arama...');
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].includes('SELECT user_id FROM channels WHERE id = ?') && lines[i].includes('video.channel_id')) {
      channelLine = i;
      console.log('Bulundu satir:', i+1);
      break;
    }
  }
}

if (channelLine !== -1) {
  // "if (channel.user_id !== userId)" satirini bul
  let ifLine = -1;
  for (let i = channelLine; i < channelLine + 5; i++) {
    if (lines[i].includes('channel.user_id !== userId')) {
      ifLine = i;
      break;
    }
  }
  
  if (ifLine !== -1) {
    // channel null kontrolu ekle
    lines[ifLine] = lines[ifLine].replace(
      'if (channel.user_id !== userId)',
      'if (channel && channel.user_id !== userId)'
    );
    console.log('Null kontrolu eklendi satir:', ifLine+1);
  }
  
  // video null kontrolu da ekle
  // "const channel = ..." satirindan once video null kontrolu
  const videoNullCheck = lines[channelLine - 1];
  console.log('Onceki satir:', channelLine, ':', videoNullCheck.substring(0, 80));
  
  // video null ise channel satirini guvenlı yap
  lines[channelLine] = lines[channelLine].replace(
    "const channel = db.prepare('SELECT user_id FROM channels WHERE id = ?').get(video.channel_id);",
    "const channel = video ? db.prepare('SELECT user_id FROM channels WHERE id = ?').get(video.channel_id) : null;"
  );
  
  fs.writeFileSync('src/routes.js', lines.join('\n'), 'utf8');
  console.log('Duzeltme yapildi');
}
