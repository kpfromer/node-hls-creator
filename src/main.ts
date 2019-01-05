// import ffmpegStatic from 'ffmpeg-static';
// import ffprobeStatic from 'ffprobe-static';
// import ffprobe from 'ffprobe';
import * as path from 'path';
import { exists, mkdir, exec } from './helper';

export interface GenerateHLS {
  inputFile: string,
  ffmpegPath?: string,
  ffprobePath?: string,
  videoCodec?: string,
  audioCodec?: string,
  threads?: number,
  segmentFolder?: string,
  segmentLength?: number,
  playlistPrefix?: string,
  playlistHLSName?: string
}

const generateHLS = async ({
  ffmpegPath = 'ffmpeg',
  inputFile,
  videoCodec = 'copy', // libx264 H264 video encoder
  audioCodec = 'copy', // aac
  threads = 0,
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
    ${output}
  ` // TODO: other commands
  console.log(command);
  await exec(command);
}

generateHLS({ inputFile: '/home/kpfromer/Downloads/SampleVideo_1280x720_10mb.mp4' });