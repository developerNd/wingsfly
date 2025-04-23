import { Endpoints } from "../Helper/Contants/Endpoints"



// Upload Single Api
export const Singlefileupload = async (file) => {
    try {
        const formdata = new FormData();
        formdata.append("file", {
            uri: file.path,
            name: file.filename || 'photo.jpg',
            type: file.mime || 'image/jpeg'
        });
        let res = await fetch(`${Endpoints.BASEURL}${Endpoints.SINGLEFILEUPLOAD}`, {
            method: "POST",
            body: formdata,
            headers: {

            }
        })
        console.log(res)
        res = await res.json()

        return res
    } catch (error) {
        return error.message
    }
}