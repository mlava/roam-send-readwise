const config = {
    tabTitle: "Send to Readwise",
    settings: [
        {
            id: "readwise-readwiseToken",
            name: "Readwise Access Token",
            description: "Your Access Token from https://readwise.io/access_token",
            action: { type: "input", placeholder: "Add Readwise Access Token here" },
        },
        {
            id: "readwise-title",
            name: "Readwise Access Token",
            description: "The title for your Readwise library",
            action: { type: "input", placeholder: "Notes from Roam Research" },
        },
        {
            id: "readwise-category",
            name: "Readwise Category",
            description: "One of books, articles, tweets or podcasts",
            action: { type: "input", placeholder: "books" },
        },
        {
            id: "readwise-tagHandling",
            name: "Tag Handling",
            description: "Either remove or replace",
            action: { type: "input", placeholder: "replace" },
        },
        {
            id: "readwise-createReadwiseHighlightLink",
            name: "Create Link to Highlights",
            description: "Set true to create a link to your highlights in Readwise at the end of the block in Roam",
            action: { type: "switch" },
        },
    ]
};

export default {
    onload: ({ extensionAPI }) => {
        extensionAPI.settings.panel.create(config);

        window.roamAlphaAPI.ui.commandPalette.addCommand({
            label: "Send to Readwise",
            callback: () => sendReadwise().then(string =>
                window.roamAlphaAPI.updateBlock({
                    block: {
                        uid: window.roamAlphaAPI.ui.getFocusedBlock()?.["block-uid"],
                        string: string,
                    }
                })
            ),
        });

        async function sendReadwise() {
            const readwiseToken = extensionAPI.settings.get("readwise-readwiseToken");
            const source = "Roam_Research";
            const title = extensionAPI.settings.get("readwise-title");
            const category = extensionAPI.settings.get("readwise-category");
            const tagHandling = extensionAPI.settings.get("readwise-tagHandling");
            const createReadwiseHighlightLink = extensionAPI.settings.get("readwise-createReadwiseHighlightLink");
            const icon_url = "https://pbs.twimg.com/profile_images/1340236260846219264/wTVeE_-6_400x400.jpg";
            
            const startBlock = await window.roamAlphaAPI.ui.getFocusedBlock()?.["block-uid"];

            const token = "Token " + readwiseToken;
            const dbname = window.location.href.split('/')[5];
            const roamuri = "https://roamresearch.com/#/app/" + dbname + "/page/" + startBlock;
            
            let q = `[:find (pull ?page
                                 [:node/title :block/string :block/uid :block/heading :block/props 
                                  :entity/attrs :block/open :block/text-align :children/view-type
                                  :block/order
                                 ])
                              :where [?page :block/uid "${startBlock}"]  ]`;
            var block = await window.roamAlphaAPI.q(q);
            var text = "";
            var note = "";
            var highlight = "";
            
            if (block[0][0].string.length > 0) {
                text = block[0][0].string;
                const regex = /#([a-zA-Z_]+)|#\[\[([a-zA-Z_\W]+)\]\]/mg;
                var subst;
                if (tagHandling == "replace") {
                    subst = `$1 $2`;
                } else if (tagHandling == "remove") {
                    subst = ` `;
                }
                var replacedText = text.replace(regex, subst);
                replacedText = replacedText.replaceAll("  ", " ")
            
                let m;
                if ((m = regex.exec(text)) !== null) {
                    if (m.index === regex.lastIndex) {
                        regex.lastIndex++;
                    }
            
                    if (m[2] == null) {
                        note += " ." + m[1].replaceAll(" ", "_");
                    } else if (m[1] == null) {
                        note += " ." + m[2].replaceAll(" ", "_");
                    }
                  
                    highlight = JSON.stringify({
                        'highlights': [
                            {
                                'text': replacedText,
                                'title': title,
                                'source_type': source,
                                'category': category,
                                'highlight_url': roamuri,
                                'note': note,
                                'image_url': icon_url
                            }
                        ]
                    });
                } else {
                    highlight = JSON.stringify({
                        'highlights': [
                            {
                                'text': replacedText,
                                'title': title,
                                'source_type': source,
                                'category': category,
                                'highlight_url': roamuri,
                                'image_url': icon_url
                            }
                        ]
                    });
                }
            
                $.ajax({
                    url: 'https://readwise.io/api/v2/highlights/',
                    type: 'POST',
                    contentType: 'application/json',
                    beforeSend: function (xhr) {
                        xhr.setRequestHeader('Authorization', token);
                    },
                    data: highlight,
                    success: function (result) {
                        // console.error(result);
                        if (createReadwiseHighlightLink == true) {
                            let highlight_url = result[0].highlights_url;
                            var newString = text + ' [Readwise highlight](' + highlight_url + ')';
                            console.error(newString);
                            window.roamAlphaAPI.updateBlock(
                                { block: { uid: startBlock, string: newString.toString(), open: true } });
                        }
                    },
                    error: function (error) { console.error(error) },
                });
            } else {
                console.error("Can't send empty block to Readwise");
                alert("You can\'t send an empty string to Readwise");
                return false;
            }
        };
    },
    onunload: () => {
        window.roamAlphaAPI.ui.commandPalette.removeCommand({
            label: 'Send to Readwise'
        });
    }
}