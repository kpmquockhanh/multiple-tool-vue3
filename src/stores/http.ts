import { defineStore } from 'pinia'
import { useAuthStore } from '@/stores/auth'
import { useRouter } from 'vue-router'
import { ref } from 'vue'
import { useToast } from 'vue-toastification'

export const useRequest = defineStore('request', () => {
  const auth = useAuthStore()
  const router = useRouter()
  const loading = ref(false)
  const toast = useToast();

  const buildUrl = (url: string, params?: Record<string, string>) => {
    const domain = import.meta.env.VITE_API_DOMAIN
    let rUrl = `${domain}${url}`
    const strParams = new URLSearchParams(params).toString()
    if (strParams.length) {
      rUrl = `${rUrl}?${strParams}`
    }
    return rUrl
  }

  const request = async (
    url: string,
    method: string,
    req: {
      body?: any,
      params?: any,
    },
    options?: {
      noLoading?: boolean,
      ignoreAuth?: boolean,
    }) => {
    if (!options?.noLoading) {
      loading.value = true
    }

    const rUrl = buildUrl(url, req.params)

    const isFormData = req.body instanceof FormData
    const body = isFormData ? req.body : JSON.stringify(req.body)

    const headers: { [key: string]: string; } = {
      // "Content-Type": "application/json",
      "Authorization": `Bearer ${auth.token}`,
    }

    if (!isFormData) {
      headers['Content-Type'] = 'application/json'
    } else {
      // headers['Content-Type'] = 'multipart/form-data'
    }

    try {
      const response = await fetch(rUrl, {
        method,
        headers,
        body
      });

      if (!options?.noLoading) {
        loading.value = false
      }

      switch (response.status) {
        case 200:
        case 201:
          return await response.json()
        case 204:
          return {}
        case 400:
          // toast.error('Bad request')
          return await response.json()
        case 401:
          if (options?.ignoreAuth) {
            return { error: 'Unauthorized' }
          }

          auth.logout()
          router.push({
            name: 'login',
          }).then()
          toast.error('Unauthorized')
          return { error: 'Unauthorized' }
        case 403:
          toast.error('Forbidden')
          break
        case 404:
          toast.error('Not found')
          return await response.json()
          break
        case 500:
          toast.error('Server error')
          break
        default:
          toast.error('Unknown status')
          break
      }
      return {}
    } catch (e) {
      console.log('error', e)
      return { error: e }
    }
  }

  const upload = async (url: string, formData: FormData) => {
    const xhr = new XMLHttpRequest();
    xhr.open('POST', buildUrl(url), true);
    xhr.setRequestHeader('Authorization', `Bearer ${auth.token}`)
    xhr.upload.onprogress = function(e) {
      if (e.lengthComputable) {
        const percentage = (e.loaded / e.total) * 100;
        console.log(percentage + '% uploaded');
      }
    };

    xhr.onerror = function(e) {
      console.log('An error occurred while submitting the form. Maybe your file is too big');
    };

    xhr.onload = function() {
      console.log(this.statusText);
    };

    xhr.send(formData);
  }
  return { request, upload, loading }
})
