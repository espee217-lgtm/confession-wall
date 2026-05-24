# Confession Wall Asset Compression Pass 4 Report

Compression type: in-place asset replacement. File paths and filenames are unchanged.
PNG rule: dimensions preserved. Active spritesheet grid mechanics preserved because width/height did not change.
MP4 rule: same path/name and 1280x720 resolution, re-encoded H.264 for smaller size.

Total old size: 101.62 MB
Total new size: 90.45 MB
Total saved: 11.17 MB (11.0%)

| File | Old MB | New MB | Saved | Dimensions kept |
|---|---:|---:|---:|---|
| `client/public/Demon.png` | 2.20 | 2.08 | 5.5% | yes (1536, 1024) -> (1536, 1024) |
| `client/public/assets/blow.png` | 2.30 | 2.18 | 5.2% | yes (1536, 1024) -> (1536, 1024) |
| `client/public/assets/kal.png` | 2.44 | 2.37 | 3.1% | yes (1672, 941) -> (1672, 941) |
| `client/public/assets/kil.png` | 2.76 | 2.71 | 1.8% | yes (1774, 887) -> (1774, 887) |
| `client/public/assets/speed.png` | 2.27 | 2.15 | 5.3% | yes (1536, 1024) -> (1536, 1024) |
| `client/public/assets/split-bouquet/flower_grove_01_front_left.png` | 2.24 | 2.00 | 10.7% | yes (1536, 1024) -> (1536, 1024) |
| `client/public/assets/split-bouquet/flower_grove_02_mid_left.png` | 2.26 | 2.10 | 7.2% | yes (1536, 1024) -> (1536, 1024) |
| `client/public/assets/split-bouquet/flower_grove_03_back_left.png` | 2.14 | 1.96 | 8.7% | yes (1536, 1024) -> (1536, 1024) |
| `client/public/assets/split-bouquet/flower_scorched_01_front_right.png` | 2.32 | 2.13 | 8.2% | yes (1536, 1024) -> (1536, 1024) |
| `client/public/assets/split-bouquet/flower_scorched_02_mid_right.png` | 2.33 | 2.14 | 7.9% | yes (1536, 1024) -> (1536, 1024) |
| `client/public/assets/split-bouquet/flower_scorched_03_back_right.png` | 2.18 | 1.97 | 9.7% | yes (1536, 1024) -> (1536, 1024) |
| `client/public/assets/split-bouquet/hand_split_alive_scorched.png` | 2.28 | 2.19 | 3.9% | yes (1536, 1024) -> (1536, 1024) |
| `client/public/assets/split-bouquet/stems_split_alive_scorched.png` | 2.23 | 2.12 | 5.2% | yes (1536, 1024) -> (1536, 1024) |
| `client/public/confession-logo.png` | 2.08 | 1.90 | 8.7% | yes (1536, 1024) -> (1536, 1024) |
| `client/public/forest.png` | 2.22 | 2.12 | 4.5% | yes (1717, 916) -> (1717, 916) |
| `client/public/krishna.png` | 2.50 | 2.38 | 4.9% | yes (1536, 1024) -> (1536, 1024) |
| `client/public/reena-choice/SpecialSectionStone.png` | 2.07 | 2.06 | 0.5% | yes (1024, 1536) -> (1024, 1536) |
| `client/public/reena-choice/choicesbg.mp4` | 4.28 | 0.66 | 84.6% | yes ('1280', '720') -> ('1280', '720') |
| `client/public/reena-choice/forest-bg.png` | 3.35 | 2.58 | 23.1% | yes (1506, 1044) -> (1506, 1044) |
| `client/public/reena-kundali/infographics2.png` | 2.23 | 0.13 | 94.4% | yes (941, 1672) -> (941, 1672) |
| `client/public/reena-kundali/infographics4.png` | 2.15 | 2.08 | 3.4% | yes (941, 1672) -> (941, 1672) |
| `client/public/reena-kundali/infographics5.png` | 2.13 | 2.06 | 3.3% | yes (941, 1672) -> (941, 1672) |
| `client/public/reena-kundali/infographics6.png` | 2.12 | 2.04 | 3.6% | yes (941, 1672) -> (941, 1672) |
| `client/public/reena-kundali/infographics8.png` | 2.12 | 2.05 | 3.3% | yes (941, 1672) -> (941, 1672) |
| `client/src/assets/avatarFrames/demon-thorn-greenkey-fixed-spritesheet.png` | 6.06 | 5.20 | 14.2% | yes (3840, 4608) -> (3840, 4608) |
| `client/src/assets/avatarFrames/grove-butterfly-greenkey-spritesheet.png` | 6.01 | 5.33 | 11.3% | yes (3840, 4608) -> (3840, 4608) |
| `client/src/assets/avatarFrames/storm-hoodie-greenkey-spritesheet.png` | 6.94 | 6.44 | 7.1% | yes (3840, 4608) -> (3840, 4608) |
| `client/src/assets/cosmetics/ice-monarch-frame/ice_monarch_avatar_frame_spritesheet_72f_8x9.png` | 11.92 | 11.92 | 0.0% | yes (4096, 4608) -> (4096, 4608) |
| `client/src/assets/cosmetics/lotus-avatar-frame/lotus_avatar_frame_spritesheet_49f_7x7.png` | 13.47 | 13.41 | 0.5% | yes (3584, 3584) -> (3584, 3584) |