import { computed, inject, type InjectionKey, provide, reactive, ref, toRaw } from 'vue'
import { umlCodeCacheRepository } from '@/repository/UmlCodeCacheRepository'
import { umlCodeSingleRepository } from '@/repository/UmlCodeSingleRepository'
import { getDefaultUmlCode, type UmlCode } from '@/entities/UmlCode'
import { convertToMd } from '@/lib/UmlCodeConverter'
import { convertToHtml } from '@/plugin/Marked'

const useUmlCodeSingle = () => {
  const state = reactive({
    umlCode: getDefaultUmlCode()
  })
  const htmlString = ref('')

  const read = async (id: UmlCode['id']) => {
    const result = await umlCodeSingleRepository.read(id)
    Object.assign(state.umlCode, result)
    umlCodeCacheRepository.save(id)
  }

  const readCache = async () => {
    const id = umlCodeCacheRepository.fetch()
    id && (await read(id))
  }

  const getCode = () => {
    return state.umlCode.code
  }

  const update = async (code: UmlCode['code']) => {
    if (!state.umlCode.id) {
      return
    }
    state.umlCode.code = code
    const result = await umlCodeSingleRepository.update(toRaw(state.umlCode))
    // updatedAt が更新される
    Object.assign(state.umlCode, result)
  }

  const destroy = async (umlCode: UmlCode) => {
    await umlCodeSingleRepository.delete(umlCode.id)
    if (state.umlCode.id === umlCode.id) {
      Object.assign(state.umlCode, getDefaultUmlCode())
      htmlString.value = ''
      umlCodeCacheRepository.reset()
    }
  }

  const setCurrentHtml = (code?: string) => {
    const { md } = convertToMd(code || state.umlCode.code, { server: import.meta.env.VITE_PLANTUML_SERVER })
    htmlString.value = convertToHtml(md)
  }

  const renderHtml = async (code: UmlCode['code']) => {
    if (!state.umlCode.id) {
      return
    }
    const { md, imgs } = convertToMd(code, { server: import.meta.env.VITE_PLANTUML_SERVER })
    state.umlCode.imgs = imgs
    // imgs を更新するため
    await update(code)
    htmlString.value = convertToHtml(md)
  }

  return {
    current: computed(() => state.umlCode),
    htmlString: computed(() => htmlString.value),
    read,
    readCache,
    getCode,
    update,
    destroy,
    setCurrentHtml,
    renderHtml
  }
}

const USE_UML_CODE_SINGLE: InjectionKey<ReturnType<typeof useUmlCodeSingle>> = Symbol('USE_UML_CODE_SINGLE')

export const provideUseUmlCodeSingle = () => {
  const useObj = useUmlCodeSingle()

  provide(USE_UML_CODE_SINGLE, useObj)

  return useObj
}

export const injectUseUmlCodeSingle = () => {
  const useObj = inject(USE_UML_CODE_SINGLE)

  if (useObj) {
    return useObj
  } else {
    throw new Error('error injectUseUmlCodeSingle')
  }
}
