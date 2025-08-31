---
created: 23 Feb 2025 2:43PM
updated: 11 Mar 2025 8:05PM
---
# Future Features List
- [ ] Shows global click count
- [x] Shows local user click count
- [x] Download image button
- [x] Dark & Light Mode
- [x] Forward & back button to see previously seen images
- [x] Side bar that shows images the user has seen, and highlights which image they are viewing in their queue, depending on if they've pressed the forward or back button or not. Ability to click on image to jump back to it for viewing.
- [ ] User image submission page that connects to AWS S3 Bucket & Lambda stuffs
- [ ] AWS Lambda & S3 Bucket to sort submitted images and push to github
- [ ] Feedback form for bugs/suggestions/features/etc (that also connects to AWS stuff)
- [ ] Dashboard type page I can access in AWS to help manage submitted images, view feedback, view statistics, etc.
- [ ] ~Discord bot that periodically adds images from a specific channel periodically~
- [ ] ~How the site works tab for users to see~
- [ ] ~maybe add background cat music potentially?~


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


**3/11/2025 8:03PM**
- a friend helped me fix them theme toggle button, it works great so far! The only fix I think it needs is on mobile, a blue box appears when tapping on it. On desktop it has no issues.
- I did notice when clicking through the site, that it shows the cat images in the same order for everyone. I'll need to take a look at it to ensure it's actually random for everyone.

**5/26/2025 9:54pm**
- I added a back button, but it doesn't work correctly. I don't fully know what's going on with it, but it loads a new image when you go back and then forward. I want it to keep the queue of images until it actually gets to a "new" one.
- I added a toast thing that appears if the back button is pressed and there is no image to go back to.
- renamed all cat pics to something like Cat_00000 with a new rename_files.py
- updated paths.txt with 'bash code.sh' (will still need to update later so I don't have to manually do it)

**7/31/2025 1:55 PM**
- fixed the back and forward buttons
- added a feedback button, need to adjust location on screen, and actually get that part of the site working
- changed "click for random cat" button to just a 🎲 emoji. The name of the website should be pretty clear as to what should happen when this button is pressed
- I really want to get this site working so I can hopefully get approved for google adsense and help pay for college. If people use adblock that's fine with me, I use it too lol

**8/31/2025 4:44 PM**
- added a sidebar that shows the user what images they have already seen. Users can click on the image to jump back to it and download. Displays the images in reverse order. Most recent cat is displayed in the top right, and reads right to left, top to bottom. The current image being viewed is highlighted in blue. Displays the images in a 3 wide column, images are cropped at about 110px x 100px in each row. I might add a feature for users to resize the row to whatever width they want.
- sidebar will grow infinitely large as needed
- replaced "forward" and "back" buttons with ⬅️➡️ instead. When using these buttons, the sidebar image is updated to highlight which image is being viewed
- I do want to add some sort of "patchnotes" page or "updates" page, so users can see how the site has changed over time.