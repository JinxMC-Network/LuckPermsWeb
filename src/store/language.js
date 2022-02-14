import axios from 'axios';

// Need to import this dynamically otherwise it becomes a circular dependency and will throw errors
const i18n = import('@/util/language');

function sortByName({ name: aName = '' }, { name: bName = '' }) {
  return aName.localeCompare(bName);
}

export default {
  state: () => ({
    userLocale: '',
    supportedLanguages: [],
    loadedLanguages: [],
  }),
  getters: {
    userLocale: (state) => {
      const { userLocale } = state;
      return state.supportedLanguages.find(({ code }) => code === userLocale);
    },
    supportedLanguages: state => state.supportedLanguages.sort(sortByName),
  },
  mutations: {
    setUserLocale(state, locale) {
      state.userLocale = locale;
    },
    setSupportedLanguages(state, languages) {
      state.supportedLanguages = languages || [];
    },
    addLoadedLanguage(state, language) {
      state.loadedLanguages.push(language);
    },
  },
  actions: {
    async setUserLocale({ state, commit, dispatch }, locale) {
      if (locale) {
        dispatch('fetchLanguage', locale);
        commit('setUserLocale', locale);

        return;
      }

      if (state.userLocale) {
        dispatch('fetchLanguage', state.userLocale);
        return;
      }

      const navigatorLanguages = [navigator.language, ...(navigator.languages || [])];
      const { supportedLanguages = [] } = state;

      let language = 'en';

      const userDefaultLanguage = supportedLanguages
        .find(({ code }) => navigatorLanguages.includes(code));

      if (userDefaultLanguage) {
        language = userDefaultLanguage.code;
      }

      dispatch('fetchLanguage', language);
      commit('setUserLocale', language);
    },
    async fetchLanguages({ commit, dispatch }) {
      const { data: { languages } } = await axios.get('https://metadata.luckperms.net/data/translations');

      languages.en = {
        code: 'en', name: 'English', localeTag: 'en_GB', progressWeb: 100,
      };

      const languageFilter = (lang) => {
        const language = languages[lang];

        if (language?.progressWeb) {
          return language.progressWeb;
        }

        return false;
      };

      const languageMap = (code) => {
        const { name, localeTag } = languages[code];

        let [, locale] = localeTag.split('_');

        locale = locale.toLowerCase();

        // Serbia doesn't get the right ISO code
        if (locale === 'cs') {
          locale = 'rs';
        }

        const flagUrl = localeTag === 'en_PT'
          ? '/twemoji-pirate-flag.png'
          : `https://flagcdn.com/w40/${locale}.png`;

        return {
          code,
          name,
          flagUrl,
        };
      };

      const langToArray = Object.keys(languages);
      const supportedLanguages = langToArray.filter(languageFilter).map(languageMap);

      commit('setSupportedLanguages', supportedLanguages);
      dispatch('setUserLocale');
    },
    async fetchLanguage(_, locale) {
      const VueI18n = (await i18n).default;

      if (locale === 'en') {
        VueI18n.locale = locale;
        return;
      }

      const { data } = await axios.get(`https://metadata.luckperms.net/translation/web/${locale}`);

      VueI18n.locale = locale;
      VueI18n.setLocaleMessage(locale, data);
    },
  },
};