//how to get environment variable in javascript
const settings_tab = require('../tab/settings')
const { getPromptShortcut } = require('../html_manip')
const general = require('../general')
// function newOutputImageName(format = 'png') {
//     const random_id = Math.floor(Math.random() * 100000000000 + 1) // Date.now() doesn't have enough resolution to avoid duplicate
//     const image_name = `output- ${Date.now()}-${random_id}.${format}`
//     console.log('generated image name:', image_name)
//     return image_name
// }

function convertMetadataToJson(metadata_str) {
    try {
        // console.log('metadata_str:', metadata_str)
        const last_new_line_index = metadata_str.lastIndexOf('\n')

        const prompt = metadata_str.slice(0, last_new_line_index)
        const other_settings = metadata_str.slice(last_new_line_index + 1, -1)

        // console.log('prompt:', prompt)
        // console.log('other_settings:', other_settings)
        const sub_settings = other_settings.split(',')
        // console.log('sub_settings: ', sub_settings)

        const settings_json = {}
        settings_json['prompt'] = prompt

        for (const setting of sub_settings) {
            let [key, value] = setting.split(':').map((s) => s.trimLeft())
            // key =  key.lstrip(' ')
            // value =  value.lstrip(' ')
            settings_json[key] = value
            // import json
            // settings_json = json.dumps(settings_dict)
            // print("settings_dict: ",settings_dict)
            // print("settings_json ",settings_json)
        }

        return settings_json
    } catch (e) {
        console.warn(e)
    }
}

async function getAuto1111Metadata(base64_image) {
    try {
        console.log('getAuto1111Metadata: ')

        const full_url = `${g_sd_url}/sdapi/v1/png-info`

        const payload = {
            image: 'data:image/png;base64,' + base64_image,
        }
        let request = await fetch(full_url, {
            method: 'POST',
            headers: {
                Accept: 'application/json',
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(payload),
        })

        let json = await request.json()
        // console.log("json['info']:", json['info'])

        // console.log('getAuto1111Metadata json:', json)

        return json['info']
    } catch (e) {
        console.warn(e)
    }
}
async function convertToStandardResponse(settings, images, uuid) {
    try {
        //standardized the response between modes and backends
        const uniqueDocumentId = uuid // maybe use the generation_session uuid

        const image_paths = []

        const metadata = []
        const images_info = []

        for (i of images) {
            let auto_metadata_json = {}
            try {
                const auto_metadata_str = await getAuto1111Metadata(i)
                auto_metadata_json = convertMetadataToJson(auto_metadata_str)
                // console.warn(
                //     'auto_metadata_json.Seed:',
                //     auto_metadata_json?.Seed
                // )
            } catch (e) {
                console.warn(e)
                auto_metadata_json = {} // set the metadata to empty if there an error while getting the metadata
            }

            const image_name = general.newOutputImageName()
            const image_path = `${uniqueDocumentId}/${image_name}`

            images_info.push({
                base64: i,
                path: image_path,
                auto_metadata: auto_metadata_json,
            })
            // console.log("metadata_json: ", metadata_json)
        }
        const dir_name = 'temp_dir_name'
        return {
            payload: settings,
            dir_name: dir_name,
            images_info: images_info,
            metadata: metadata,
        }
    } catch (e) {
        console.warn(e)
    }
}
function replacePromptsWithShortcuts(
    prompt,
    negative_prompt,
    prompt_shortcut_dic
) {
    //     const prompt_shortcut_dict = prompt_shortcut.load()
    //     prompt_shortcut_dict.update(payload["prompt_shortcut_ui_dict"])
    new_prompt = prompt_shortcut.replaceShortcut(prompt, prompt_shortcut_dic)
    // # edit negative prompt, replaceShortcut(negative_prompt)
    new_negative_prompt = prompt_shortcut.replaceShortcut(
        negative_prompt,
        prompt_shortcut_dic
    )
    return [new_prompt, new_negative_prompt]
}
async function txt2ImgRequest(payload) {
    console.log('payload:', payload)

    if (payload['use_prompt_shortcut']) {
        const [new_prompt, new_negative_prompt] = replacePromptsWithShortcuts(
            payload['prompt'],
            payload['negative_prompt'],
            payload['prompt_shortcut_ui_dict']
        )
        payload['prompt'] = new_prompt
        payload['negative_prompt'] = new_negative_prompt
    }

    const endpoint = 'sdapi/v1/txt2img'
    try {
        console.log('txt2ImgRequest(): about to send a fetch request')

        const full_url = `${g_sd_url}/${endpoint}`
        console.log(full_url)

        let request = await fetch(full_url, {
            method: 'POST',
            headers: {
                Accept: 'application/json',
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(payload),
            // "body": payload
        })

        let r = await request.json()
        // console.log('txt2ImgRequest json:', r)

        const uniqueDocumentId = payload['uniqueDocumentId']
        // dir_fullpath,dirName = serverHelper.getUniqueDocumentDirPathName(uniqueDocumentId)
        // serverHelper.createFolder(dir_fullpath)
        const image_paths = []

        const metadata = []
        const images_info = []

        for (i of r['images']) {
            let auto_metadata_json = {}
            try {
                const auto_metadata_str = await getAuto1111Metadata(i)
                auto_metadata_json = convertMetadataToJson(auto_metadata_str)
                console.warn(
                    'auto_metadata_json.Seed:',
                    auto_metadata_json?.Seed
                )
            } catch (e) {
                console.warn(e)
                auto_metadata_json = {} // set the metadata to empty if there an error while getting the metadata
            }

            // response2 = await client.post(url=f'{sd_url}/sdapi/v1/png-info', json=png_payload)
            // pnginfo = PngImagePlugin.PngInfo()
            // pnginfo.add_text("parameters", response2.json().get("info"))

            const image_name = general.newOutputImageName()
            const image_path = `${uniqueDocumentId}/${image_name}`

            // image_path = f'output/{dirName}/{image_name}'
            // image_paths.append(image_path)
            // image.save(f'./{image_path}', pnginfo=pnginfo)

            // metadata_info = response2.json().get("info")
            // metadata_json = metadata_to_json.convertMetadataToJson(metadata_info)
            // metadata.append(metadata_json)

            images_info.push({
                base64: i,
                path: image_path,
                auto_metadata: auto_metadata_json,
            })
            // console.log("metadata_json: ", metadata_json)
        }
        const dir_name = 'temp_dir_name'
        return {
            payload: payload,
            dir_name: dir_name,
            images_info: images_info,
            metadata: metadata,
        }
    } catch (e) {
        console.warn(e)
        return {}
    }

    // const request_path = '/sdapi/v1/txt2img'
}
function getExtensionUrl() {
    const extension_type = settings_tab_ts.store.data.extension_type
    let extension_url

    if (extension_type === 'auto1111_extension') {
        extension_url = `${g_sd_url}/sdapi/auto-photoshop-sd`
    } else if (extension_type === 'proxy_server') {
        extension_url = 'http://127.0.0.1:8000'
    } else {
        //none
        extension_url = ''
    }
    return extension_url
}

async function openUrlRequest(url) {
    try {
        const payload = {
            url: url,
        }

        const extension_url = getExtensionUrl()
        const full_url = `${extension_url}/open/url/`
        let request = await fetch(full_url, {
            method: 'POST',
            headers: {
                Accept: 'application/json',
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(payload),
            // "body": payload
        })

        let r = await request.json()

        console.log('openUrlRequest json:', r)
        return r['url']
    } catch (e) {
        console.warn(e)
    }
}
async function maskExpansionRequest(original_mask, mask_expansion_value, blur) {
    // const endpoint = 'sdapi/v1/img2img'
    // const full_url = `${g_sd_url}/${endpoint}`

    try {
        const payload = {
            mask: original_mask,
            mask_expansion: mask_expansion_value,
            blur: blur,
        }

        const extension_url = getExtensionUrl()
        const full_url = `${extension_url}/mask/expansion/`
        let request = await fetch(full_url, {
            method: 'POST',
            headers: {
                Accept: 'application/json',
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(payload),
            // "body": payload
        })

        let r = await request.json()

        // console.log('maskExpansionRequest json:', r)
        return r['mask']
    } catch (e) {
        console.warn(e)
    }
}
async function img2ImgRequest(sd_url, payload) {
    console.log('payload:', payload)

    if (payload['use_prompt_shortcut']) {
        const [new_prompt, new_negative_prompt] = replacePromptsWithShortcuts(
            payload['prompt'],
            payload['negative_prompt'],
            payload['prompt_shortcut_ui_dict']
        )
        payload['prompt'] = new_prompt
        payload['negative_prompt'] = new_negative_prompt
    }

    const endpoint = 'sdapi/v1/img2img'

    const full_url = `${sd_url}/${endpoint}`
    let request = await fetch(full_url, {
        method: 'POST',
        headers: {
            Accept: 'application/json',
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
        // "body": payload
    })

    let r = await request.json()

    console.log('img2ImgRequest json:', r)

    const uniqueDocumentId = payload['uniqueDocumentId']
    // dir_fullpath,dirName = serverHelper.getUniqueDocumentDirPathName(uniqueDocumentId)
    // serverHelper.createFolder(dir_fullpath)
    const image_paths = []
    const metadata = []
    const images_info = []

    for (i of r['images']) {
        // image = Image.open(io.BytesIO(base64.b64decode(i.split(",",1)[0])))
        let auto_metadata_json = {}
        try {
            const auto_metadata_str = await getAuto1111Metadata(i)
            auto_metadata_json = convertMetadataToJson(auto_metadata_str)
        } catch (e) {
            console.warn(e)
            auto_metadata_json = {} // set the metadata to empty if there an error while getting the metadata
        }
        // response2 = await client.post(url=f'{sd_url}/sdapi/v1/png-info', json=png_payload, timeout=None)
        // pnginfo = PngImagePlugin.PngInfo()
        // pnginfo.add_text("parameters", response2.json().get("info"))
        // image_name = f'output- {time.time()}.png'
        // image_path = f'output/{dirName}/{image_name}'
        // image_paths.append(image_path)
        // image.save(f'./{image_path}', pnginfo=pnginfo)

        // metadata_info = response2.json().get("info")
        // metadata_json = metadata_to_json.convertMetadataToJson(metadata_info)
        // metadata.append(metadata_json)
        const image_name = general.newOutputImageName()
        const image_path = `${uniqueDocumentId}/${image_name}`

        images_info.push({
            base64: i,
            path: image_path,
            auto_metadata: auto_metadata_json,
        })
        // print("metadata_json: ", metadata_json)
    }
    const dir_name = 'temp_dir_name'
    // return [dirName, images_info, metadata]
    return {
        payload: payload,
        dir_name: dir_name,
        images_info: images_info,
        metadata: metadata,
    }
}

async function savePromptShortcut(json, file_name) {
    console.warn(
        "savePromptShortcut() is deprecated, use it's IO class instead "
    )
    try {
        const json_file_name = file_name

        const folder = await storage.localFileSystem.getDataFolder()

        const file = await folder.createFile(json_file_name, {
            type: storage.types.file,
            overwrite: true,
        })

        const JSONInPrettyFormat = JSON.stringify(json, undefined, 4)
        await file.write(JSONInPrettyFormat, {
            format: storage.formats.utf8,
            append: false,
        })
    } catch (e) {
        console.warn(e)
    }
}

async function loadPromptShortcut(file_name) {
    const json_file_name = file_name

    const folder = await storage.localFileSystem.getDataFolder()

    try {
        const json_entry = await folder.getEntry(json_file_name)
        if (json_entry) {
            // await json_entry.read()

            const json = JSON.parse(
                await json_entry.read({
                    format: storage.formats.utf8,
                })
            )
            return json
        }
    } catch (e) {
        console.warn(e)
        return {}
    }
}

async function extraSingleImageRequest(sd_url, payload) {
    console.log('extraSingleImageRequest payload:', payload)

    const endpoint = 'sdapi/v1/extra-single-image'

    const full_url = `${sd_url}/${endpoint}`
    let request = await fetch(full_url, {
        method: 'POST',
        headers: {
            Accept: 'application/json',
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
        // "body": payload
    })

    let r = await request.json()

    const images_info = []

    const image = r['image']

    let auto_metadata_json = {}

    const uniqueDocumentId = payload['uniqueDocumentId']
    const image_name = general.newOutputImageName()
    const image_path = `${uniqueDocumentId}/${image_name}`

    images_info.push({
        base64: image,
        path: image_path,
        auto_metadata: auto_metadata_json,
    })

    console.log('extraSingleImageRequest response json:', r)

    const dir_name = 'temp_dir_name'
    const metadata = []

    return {
        payload: payload,
        dir_name: dir_name,
        images_info: images_info,
        metadata: metadata,
    }
}

module.exports = {
    txt2ImgRequest,
    img2ImgRequest,
    maskExpansionRequest,
    getExtensionUrl,
    savePromptShortcut,
    loadPromptShortcut,

    convertMetadataToJson,
    openUrlRequest,
    replacePromptsWithShortcuts,
    extraSingleImageRequest,
    convertToStandardResponse,
}
