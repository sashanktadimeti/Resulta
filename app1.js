import decodeAudio from "audio-decode";
import fs from "fs";
import express from "express";

const app = express();
app.set("view engine", "ejs");
const buffer = fs.readFileSync("audio/ninethsong.mp3");

async function loadBuffer() {
  const audioBuffer = await decodeAudio(buffer);
  return audioBuffer;
}

const calculateAmplitudeAndIntensity = async () => {
  const data = await loadBuffer();
  const sampleRate = data.sampleRate;
  const duration = data.duration;
  const numChannels = data.numberOfChannels;
  const channelData = data._channelData;
  const intensities = [];

  const samplesPerSecond = Math.floor(sampleRate);
  for (let i = 0; i <duration; i++) {
    let sum = 0;
    let maxAmplitude = 0;
    const startSample = i * samplesPerSecond;
    const endSample = (i + 1) * samplesPerSecond;
    for (let j = startSample; j < endSample; j++) {
      for (let k = 0; k < numChannels; k++) {
        const sample = Math.abs(channelData[k][j]);
        sum += sample;
        if (sample > maxAmplitude) {
          maxAmplitude = sample;
        }
      }
    }
    const averageAmplitude = sum / (samplesPerSecond * numChannels);
    const intensity = maxAmplitude * maxAmplitude;

    intensities.push(intensity);
  }

  return intensities;
};
app.use('/audio', express.static('audio'));

app.get("/", async (req, res) => {
  const intensities=await calculateAmplitudeAndIntensity();
  res.render('soundwave',{intensities:JSON.stringify(intensities)})
});

app.listen(5000, () => {
  console.log("server running.....");
});
