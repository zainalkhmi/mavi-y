import { assign, createMachine } from 'xstate';

export const createStudioModelMachine = () => createMachine({
    id: 'studioModel',
    initial: 'browsing',
    context: ({ input }) => ({
        models: input?.initialModels || [],
        searchTerm: '',
        selectedModel: null,
        showHelp: false
    }),
    states: {
        browsing: {
            on: {
                CREATE_MODEL: {
                    target: 'building',
                    actions: assign(() => ({
                        selectedModel: {
                            id: `model_${Date.now()}`,
                            name: 'New Motion Model',
                            description: 'Description of the new model',
                            created: new Date().toISOString().split('T')[0],
                            states: 0,
                            rules: 0,
                            statesList: [],
                            transitions: [],
                            isNew: true
                        }
                    }))
                },
                EDIT_MODEL: {
                    target: 'building',
                    actions: assign(({ event }) => ({ selectedModel: event.model }))
                },
                CONFIRM_DELETE: {
                    actions: assign(({ context, event }) => ({
                        models: context.models.filter((m) => m.id !== event.id)
                    }))
                },
                CONFIRM_RENAME: {
                    actions: assign(({ context, event }) => ({
                        models: context.models.map((m) => m.id === event.id ? { ...m, name: event.newName } : m)
                    }))
                },
                UPDATE_DESCRIPTION: {
                    actions: assign(({ context, event }) => ({
                        models: context.models.map((m) => m.id === event.id ? { ...m, description: event.description } : m)
                    }))
                },
                SEARCH_CHANGED: {
                    actions: assign(({ event }) => ({ searchTerm: event.value }))
                },
                OPEN_HELP: {
                    actions: assign(() => ({ showHelp: true }))
                },
                CLOSE_HELP: {
                    actions: assign(() => ({ showHelp: false }))
                }
            }
        },
        building: {
            on: {
                CLOSE_BUILDER: {
                    target: 'browsing',
                    actions: assign(() => ({ selectedModel: null }))
                },
                SAVE_MODEL: {
                    target: 'browsing',
                    actions: assign(({ context, event }) => {
                        const updatedModel = event.updatedModel;
                        const exists = context.models.some((m) => m.id === updatedModel.id);
                        return {
                            models: exists
                                ? context.models.map((m) => m.id === updatedModel.id ? updatedModel : m)
                                : [...context.models, { ...updatedModel, isNew: false }],
                            selectedModel: null
                        };
                    })
                }
            }
        }
    }
});
