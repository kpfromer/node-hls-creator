// import ffmpegStatic from 'ffmpeg-static';
// import ffprobeStatic from 'ffprobe-static';
// import ffprobe from 'ffprobe';
import * as path from 'path';
import { exists, mkdir, exec } from './helper';

export interface Resolution {
  height: number;
  width: number;
}

export interface GenerateHLS {
  inputFile: string;
  ffmpegPath?: string;
  ffprobePath?: string;
  videoCodec?: string;
  audioCodec?: string;
  threads?: number;
  bitrate?: string;
  constantBitrate?: boolean;
  resolution?: Resolution;
  segmentFolder?: string;
  segmentLength?: number;
  playlistPrefix?: string;
  playlistHLSName?: string;
}

const generateHLS = async ({
  ffmpegPath = 'ffmpeg',
  inputFile,
  videoCodec = 'libx264', // libx264 H264 video encoder
  audioCodec = 'aac', // aac
  threads = 0,
  bitrate,
  constantBitrate = false,
  resolution,
  segmentFolder = 'output',
  segmentLength = 0,
  playlistPrefix = path.basename(inputFile, path.extname(inputFile)),
  playlistHLSName = path.join(segmentFolder, `${playlistPrefix}.m3u8`) // TODO: bit rate in name!
}: GenerateHLS) => {
  // TODO: check if videoCodec and audioCodec are same with input if so then copy codecs! for speed
  if (!(await exists(inputFile))) {
    throw new TypeError(`Input file does not exists: ${inputFile}`);
  }
  if (!(await exists(segmentFolder))) {
    await mkdir(segmentFolder);
  }

  // Resolution
  const resolutionCommand = !!resolution ? `-vf scale=${resolution.width}:${resolution.height}` : '';

  // Bitrate (LOOK LINE 415/440)
  let bitrateCommand = '';
  if (typeof bitrate === 'string') {
    bitrateCommand = `-b:v ${bitrate}k`;
    if (constantBitrate) {
      bitrateCommand += ` -bufsize ${bitrate}k -minrate ${bitrate}k -maxrate ${bitrate}k`;
    }
  }

  const output = path.join(segmentFolder, `${playlistPrefix}_%05d.ts`);
  const command = `${ffmpegPath} -i ${inputFile} \
    -y \
    -vcodec ${videoCodec} \
    -acodec ${audioCodec} \
    -threads ${threads} \
    -map 0 \
    -flags \
    -global_header \
    -f segment \
    -segment_list ${playlistHLSName} \
    -segment_time ${segmentLength} \
    -segment_format mpeg_ts \
    ${bitrateCommand} \
    ${resolutionCommand} \
    ${output}
  ` // TODO: other commands
  await exec(command);
  return `${playlistPrefix}.m3u8`;
}

export interface HLSPlaylist {
  resolutions?: (Resolution & { bitrate: string })[];
}

const generatePlaylist = async ({ resolutions, ...singleHLSInfo }: Omit<Omit<GenerateHLS, 'resolution'>, 'bitrate'> & HLSPlaylist) => {
  if (Array.isArray(resolutions)) {
    const playlistNames: { name: string, resolution: Resolution & { bitrate: string } }[] = [];
    for (let resolution of resolutions) {
      const { width, height, bitrate } = resolution;
      const { inputFile, playlistPrefix } = singleHLSInfo;
      let name = !!playlistPrefix ? playlistPrefix : path.basename(inputFile, path.extname(inputFile))
      name = `${name}-${width}x${height}-${bitrate}br`;
      const playlistName = await generateHLS({
        ...singleHLSInfo,
        bitrate,
        resolution: { height, width },
        playlistPrefix: name
      });
      playlistNames.push({
        name: playlistName,
        resolution
      });
    }

    const masterHLSFile = playlistNames.reduce((prev, playlist) => {
      const hlsString = `#EXT-X-STREAM-INF:BANDWIDTH=${Math.floor(parseFloat(playlist.resolution.bitrate) * 1000)}\n${playlist.name}`
      return `${prev}\n${hlsString}`
    }, '#EXTM3U')
    await writeFile(path.join('output', `master.m3u8`), masterHLSFile)
  } else {
    generateHLS(singleHLSInfo);
  }
} 