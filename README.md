# Future Features List
- [x] Shows global click count
- [x] Shows local user click count
- [x] Download button
- [x] Dark & Light Mode
- [ ] Discord bot that periodically adds images from a specific channel periodically
- [ ] Auto sorts for duplicate images
- [ ] How the site works tab for users to see
- [ ] maybe add background cat music potentially?


# Devlog
**2/24/2025 1:08AM**
- added a lot of imgs hehe
- it does lag a bit when clicking fast because it finds loads a new img every time. I want to preload like 3-4 images to prevent the laggy feeling.
- I'm slowly learning how to do Full Stack stuff again
- this is gonna be so fun once it gets going
##### TODO
- add a default img before the clicking starts
- eventually add all the imgs I have and rename them all to be shorter
- run the code.sh on my NAS to update the paths.txt file every so often
- decide how often to build and deploy the site as there is a limit to the Action time [@here](https://docs.github.com/en/actions/administering-github-actions/usage-limits-billing-and-administration)
- rearrange buttons and containers to maximize cat img size
- add a small pop-up to explain how things work
- decide on theme to be more charming

**2/25/2025 8:13PM**
- I want to add a light/dark mode toggle switch that has a cat in it depending on which mode. An orange cat when it's light mode, a black/gray cat when it's dark mode. idk how to do that but I'll find out.

**2/26/2025 11:11PM**
- I used ChatGPT to help me write a simple python program that will find duplicate images in the Cat-Imgs folder, and it returns a txt file that contains the filenames of duplicate images
- I want to be able to automate this at some point, so that it can run automatically without me having to stop the GitPush to update the img folder
- possible idea: have the python program move the duplicate images in a separate folder for me to sort through manually, and GitPush the filtered img folder. I can then sort the images and put the non-duplicates in it.
- (idea) have my own private GUI on my site that contains the duplicates and that lets me sort them there. I'd have a login and only I could access it
- I also need to plan to get an img NSFW filter once I start the user uploaded imgs in Discord. I'll worry about that when I get to it
- I want to buy a domain so I can get the AdSense up and running asap

**2/28/2025 12:42AM**
- I got a new domain at randomcat.click from Namecheap, and it's all connected to the github pages!
- Began authorization for my site to have google ads on it
- the first remove_duplicates.py only works for images that are literally the exact same using hashes. Because I'm sure there will be images with txt on them or that are edited, I began working on one that actually compares the pixels called remove_similar.py. Right now it's really slow bc it compares all of them one by one. It took ~180 seconds for it to run. I eventually want it to only compare the newly added images to the existing images and then update the paths.txt file.
- I also want to rename paths.txt to something else, but I'll do that later
- began looking at cat SVGs that I could use for the theme button changer
- still need to add a default image for when the person loads the site. OR (I just had an idea) have it load one of the random images to start, then it'll continue.
- still need to add a preloader thing so it loads the next 5-6 images instead of only 1 at a time
- I want to change the html so the images will display fully without being cut off on the sides or the top. Will work on that later
- turns out the total Action time is 35 days (I think) so I shouldn't be too worried about git-pushing and publishing. Once it's automated though I will need to account for that. Right now in the beginning phases it's ok.