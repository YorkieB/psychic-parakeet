/* tslint:disable */
/* eslint-disable */
// WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
import type { TsoaRoute } from '@tsoa/runtime';
import {  fetchMiddlewares, ExpressTemplateService } from '@tsoa/runtime';
// WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
import { WebAgentController } from './../../../src/api/controllers/web-agent-controller';
// WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
import { KnowledgeAgentController } from './../../../src/api/controllers/knowledge-agent-controller';
// WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
import { DialogueAgentController } from './../../../src/api/controllers/dialogue-agent-controller';
import type { Request as ExRequest, Response as ExResponse, RequestHandler, Router } from 'express';



// WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

const models: TsoaRoute.Models = {
    "MemoryUsageSnapshot": {
        "dataType": "refObject",
        "properties": {
            "rss": {"dataType":"double"},
            "heapTotal": {"dataType":"double"},
            "heapUsed": {"dataType":"double"},
            "external": {"dataType":"double"},
            "arrayBuffers": {"dataType":"double"},
        },
        "additionalProperties": false,
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "AgentHealthResponse": {
        "dataType": "refObject",
        "properties": {
            "status": {"dataType":"union","subSchemas":[{"dataType":"enum","enums":["healthy"]},{"dataType":"enum","enums":["degraded"]},{"dataType":"enum","enums":["unhealthy"]}],"required":true},
            "uptime": {"dataType":"double","required":true},
            "memory": {"ref":"MemoryUsageSnapshot"},
            "requestCount": {"dataType":"double"},
            "errorCount": {"dataType":"double"},
            "avgResponseTime": {"dataType":"double"},
        },
        "additionalProperties": false,
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "AgentMetricsResponse": {
        "dataType": "refObject",
        "properties": {
            "requestCount": {"dataType":"double","required":true},
            "errorCount": {"dataType":"double","required":true},
            "uptime": {"dataType":"double","required":true},
            "lastRequest": {"dataType":"string"},
            "averageResponseTime": {"dataType":"double"},
            "status": {"dataType":"string"},
        },
        "additionalProperties": false,
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "SearchResultItem": {
        "dataType": "refObject",
        "properties": {
            "title": {"dataType":"string","required":true},
            "url": {"dataType":"string","required":true},
            "snippet": {"dataType":"string","required":true},
            "hostname": {"dataType":"string","required":true},
        },
        "additionalProperties": false,
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "WebSearchPayload": {
        "dataType": "refObject",
        "properties": {
            "results": {"dataType":"array","array":{"dataType":"refObject","ref":"SearchResultItem"},"required":true},
            "query": {"dataType":"string","required":true},
            "resultCount": {"dataType":"double","required":true},
            "timestamp": {"dataType":"string","required":true},
            "source": {"dataType":"union","subSchemas":[{"dataType":"enum","enums":["brave"]},{"dataType":"enum","enums":["google"]},{"dataType":"enum","enums":["fallback"]}],"required":true},
            "duration": {"dataType":"double"},
            "error": {"dataType":"string"},
        },
        "additionalProperties": false,
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "AgentExecutionMetadata": {
        "dataType": "refObject",
        "properties": {
            "duration": {"dataType":"double","required":true},
            "retryCount": {"dataType":"double","required":true},
        },
        "additionalProperties": false,
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "WebSearchResponseEnvelope": {
        "dataType": "refObject",
        "properties": {
            "success": {"dataType":"boolean","required":true},
            "data": {"ref":"WebSearchPayload","required":true},
            "metadata": {"ref":"AgentExecutionMetadata","required":true},
            "error": {"dataType":"string"},
        },
        "additionalProperties": false,
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "AgentErrorEnvelope": {
        "dataType": "refObject",
        "properties": {
            "success": {"dataType":"enum","enums":[false],"required":true},
            "error": {"dataType":"string","required":true},
            "metadata": {"ref":"AgentExecutionMetadata","required":true},
        },
        "additionalProperties": false,
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "WebSearchRequest": {
        "dataType": "refObject",
        "properties": {
            "query": {"dataType":"string","required":true},
            "maxResults": {"dataType":"double"},
            "engine": {"dataType":"union","subSchemas":[{"dataType":"enum","enums":["auto"]},{"dataType":"enum","enums":["brave"]},{"dataType":"enum","enums":["google"]}]},
        },
        "additionalProperties": false,
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "ResearchSourceItem": {
        "dataType": "refObject",
        "properties": {
            "title": {"dataType":"string","required":true},
            "url": {"dataType":"string","required":true},
            "snippet": {"dataType":"string","required":true},
            "relevance": {"dataType":"double","required":true},
            "hostname": {"dataType":"string","required":true},
        },
        "additionalProperties": false,
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "KnowledgeResearchPayload": {
        "dataType": "refObject",
        "properties": {
            "topic": {"dataType":"string","required":true},
            "summary": {"dataType":"string","required":true},
            "sources": {"dataType":"array","array":{"dataType":"refObject","ref":"ResearchSourceItem"},"required":true},
            "keyPoints": {"dataType":"array","array":{"dataType":"string"},"required":true},
            "confidence": {"dataType":"double","required":true},
            "timestamp": {"dataType":"string","required":true},
            "queriesUsed": {"dataType":"double","required":true},
            "depth": {"dataType":"union","subSchemas":[{"dataType":"enum","enums":["quick"]},{"dataType":"enum","enums":["medium"]},{"dataType":"enum","enums":["deep"]}],"required":true},
        },
        "additionalProperties": false,
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "KnowledgeResearchResponseEnvelope": {
        "dataType": "refObject",
        "properties": {
            "success": {"dataType":"enum","enums":[true],"required":true},
            "data": {"ref":"KnowledgeResearchPayload","required":true},
            "metadata": {"ref":"AgentExecutionMetadata","required":true},
        },
        "additionalProperties": false,
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "KnowledgeResearchRequest": {
        "dataType": "refObject",
        "properties": {
            "topic": {"dataType":"string","required":true},
            "depth": {"dataType":"union","subSchemas":[{"dataType":"enum","enums":["quick"]},{"dataType":"enum","enums":["medium"]},{"dataType":"enum","enums":["deep"]}]},
        },
        "additionalProperties": false,
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "KnowledgeFactCheckPayload": {
        "dataType": "refObject",
        "properties": {
            "claim": {"dataType":"string","required":true},
            "verdict": {"dataType":"union","subSchemas":[{"dataType":"enum","enums":["CONFIRMED"]},{"dataType":"enum","enums":["DISPUTED"]},{"dataType":"enum","enums":["UNVERIFIED"]}],"required":true},
            "confidence": {"dataType":"double","required":true},
            "confirmingSources": {"dataType":"array","array":{"dataType":"refObject","ref":"ResearchSourceItem"},"required":true},
            "contradictingSources": {"dataType":"array","array":{"dataType":"refObject","ref":"ResearchSourceItem"},"required":true},
            "neutralSources": {"dataType":"array","array":{"dataType":"refObject","ref":"ResearchSourceItem"},"required":true},
            "explanation": {"dataType":"string","required":true},
            "timestamp": {"dataType":"string","required":true},
        },
        "additionalProperties": false,
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "KnowledgeFactCheckResponseEnvelope": {
        "dataType": "refObject",
        "properties": {
            "success": {"dataType":"enum","enums":[true],"required":true},
            "data": {"ref":"KnowledgeFactCheckPayload","required":true},
            "metadata": {"ref":"AgentExecutionMetadata","required":true},
        },
        "additionalProperties": false,
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "KnowledgeFactCheckRequest": {
        "dataType": "refObject",
        "properties": {
            "claim": {"dataType":"string","required":true},
            "sources": {"dataType":"double"},
        },
        "additionalProperties": false,
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "SummarySourceItem": {
        "dataType": "refObject",
        "properties": {
            "title": {"dataType":"string","required":true},
            "url": {"dataType":"string","required":true},
        },
        "additionalProperties": false,
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "KnowledgeSummaryPayload": {
        "dataType": "refObject",
        "properties": {
            "query": {"dataType":"string","required":true},
            "summary": {"dataType":"string","required":true},
            "sources": {"dataType":"array","array":{"dataType":"refObject","ref":"SummarySourceItem"},"required":true},
            "wordCount": {"dataType":"double","required":true},
            "timestamp": {"dataType":"string","required":true},
        },
        "additionalProperties": false,
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "KnowledgeSummaryResponseEnvelope": {
        "dataType": "refObject",
        "properties": {
            "success": {"dataType":"enum","enums":[true],"required":true},
            "data": {"ref":"KnowledgeSummaryPayload","required":true},
            "metadata": {"ref":"AgentExecutionMetadata","required":true},
        },
        "additionalProperties": false,
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "KnowledgeSummarizeRequest": {
        "dataType": "refObject",
        "properties": {
            "query": {"dataType":"string","required":true},
            "maxSources": {"dataType":"double"},
        },
        "additionalProperties": false,
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "DialogueRespondPayload": {
        "dataType": "refObject",
        "properties": {
            "response": {"dataType":"string","required":true},
            "message": {"dataType":"string","required":true},
            "source": {"dataType":"union","subSchemas":[{"dataType":"enum","enums":["llm"]},{"dataType":"enum","enums":["llm+web"]},{"dataType":"enum","enums":["mock"]}],"required":true},
            "timestamp": {"dataType":"string","required":true},
        },
        "additionalProperties": false,
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "DialogueResponseEnvelope": {
        "dataType": "refObject",
        "properties": {
            "success": {"dataType":"enum","enums":[true],"required":true},
            "data": {"ref":"DialogueRespondPayload","required":true},
            "metadata": {"ref":"AgentExecutionMetadata","required":true},
        },
        "additionalProperties": false,
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "Record_string.string_": {
        "dataType": "refAlias",
        "type": {"dataType":"nestedObjectLiteral","nestedProperties":{},"additionalProperties":{"dataType":"string"},"validators":{}},
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "DialogueRespondRequest": {
        "dataType": "refObject",
        "properties": {
            "message": {"dataType":"string","required":true},
            "context": {"ref":"Record_string.string_"},
        },
        "additionalProperties": false,
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
};
const templateService = new ExpressTemplateService(models, {"noImplicitAdditionalProperties":"silently-remove-extras","bodyCoercion":true});

// WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa




export function RegisterRoutes(app: Router) {

    // ###########################################################################################################
    //  NOTE: If you do not see routes for all of your controllers in this file, then you might not have informed tsoa of where to look
    //      Please look into the "controllerPathGlobs" config option described in the readme: https://github.com/lukeautry/tsoa
    // ###########################################################################################################


    
        const argsWebAgentController_getHealth: Record<string, TsoaRoute.ParameterSchema> = {
        };
        app.get('/api/web/health',
            ...(fetchMiddlewares<RequestHandler>(WebAgentController)),
            ...(fetchMiddlewares<RequestHandler>(WebAgentController.prototype.getHealth)),

            async function WebAgentController_getHealth(request: ExRequest, response: ExResponse, next: any) {

            // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

            let validatedArgs: any[] = [];
            try {
                validatedArgs = templateService.getValidatedArgs({ args: argsWebAgentController_getHealth, request, response });

                const controller = new WebAgentController();

              await templateService.apiHandler({
                methodName: 'getHealth',
                controller,
                response,
                next,
                validatedArgs,
                successStatus: 200,
              });
            } catch (err) {
                return next(err);
            }
        });
        // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
        const argsWebAgentController_getMetrics: Record<string, TsoaRoute.ParameterSchema> = {
        };
        app.get('/api/web/metrics',
            ...(fetchMiddlewares<RequestHandler>(WebAgentController)),
            ...(fetchMiddlewares<RequestHandler>(WebAgentController.prototype.getMetrics)),

            async function WebAgentController_getMetrics(request: ExRequest, response: ExResponse, next: any) {

            // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

            let validatedArgs: any[] = [];
            try {
                validatedArgs = templateService.getValidatedArgs({ args: argsWebAgentController_getMetrics, request, response });

                const controller = new WebAgentController();

              await templateService.apiHandler({
                methodName: 'getMetrics',
                controller,
                response,
                next,
                validatedArgs,
                successStatus: 200,
              });
            } catch (err) {
                return next(err);
            }
        });
        // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
        const argsWebAgentController_search: Record<string, TsoaRoute.ParameterSchema> = {
                body: {"in":"body","name":"body","required":true,"ref":"WebSearchRequest"},
        };
        app.post('/api/web/search',
            ...(fetchMiddlewares<RequestHandler>(WebAgentController)),
            ...(fetchMiddlewares<RequestHandler>(WebAgentController.prototype.search)),

            async function WebAgentController_search(request: ExRequest, response: ExResponse, next: any) {

            // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

            let validatedArgs: any[] = [];
            try {
                validatedArgs = templateService.getValidatedArgs({ args: argsWebAgentController_search, request, response });

                const controller = new WebAgentController();

              await templateService.apiHandler({
                methodName: 'search',
                controller,
                response,
                next,
                validatedArgs,
                successStatus: 200,
              });
            } catch (err) {
                return next(err);
            }
        });
        // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
        const argsKnowledgeAgentController_getHealth: Record<string, TsoaRoute.ParameterSchema> = {
        };
        app.get('/api/knowledge/health',
            ...(fetchMiddlewares<RequestHandler>(KnowledgeAgentController)),
            ...(fetchMiddlewares<RequestHandler>(KnowledgeAgentController.prototype.getHealth)),

            async function KnowledgeAgentController_getHealth(request: ExRequest, response: ExResponse, next: any) {

            // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

            let validatedArgs: any[] = [];
            try {
                validatedArgs = templateService.getValidatedArgs({ args: argsKnowledgeAgentController_getHealth, request, response });

                const controller = new KnowledgeAgentController();

              await templateService.apiHandler({
                methodName: 'getHealth',
                controller,
                response,
                next,
                validatedArgs,
                successStatus: 200,
              });
            } catch (err) {
                return next(err);
            }
        });
        // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
        const argsKnowledgeAgentController_getMetrics: Record<string, TsoaRoute.ParameterSchema> = {
        };
        app.get('/api/knowledge/metrics',
            ...(fetchMiddlewares<RequestHandler>(KnowledgeAgentController)),
            ...(fetchMiddlewares<RequestHandler>(KnowledgeAgentController.prototype.getMetrics)),

            async function KnowledgeAgentController_getMetrics(request: ExRequest, response: ExResponse, next: any) {

            // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

            let validatedArgs: any[] = [];
            try {
                validatedArgs = templateService.getValidatedArgs({ args: argsKnowledgeAgentController_getMetrics, request, response });

                const controller = new KnowledgeAgentController();

              await templateService.apiHandler({
                methodName: 'getMetrics',
                controller,
                response,
                next,
                validatedArgs,
                successStatus: 200,
              });
            } catch (err) {
                return next(err);
            }
        });
        // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
        const argsKnowledgeAgentController_research: Record<string, TsoaRoute.ParameterSchema> = {
                body: {"in":"body","name":"body","required":true,"ref":"KnowledgeResearchRequest"},
        };
        app.post('/api/knowledge/research',
            ...(fetchMiddlewares<RequestHandler>(KnowledgeAgentController)),
            ...(fetchMiddlewares<RequestHandler>(KnowledgeAgentController.prototype.research)),

            async function KnowledgeAgentController_research(request: ExRequest, response: ExResponse, next: any) {

            // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

            let validatedArgs: any[] = [];
            try {
                validatedArgs = templateService.getValidatedArgs({ args: argsKnowledgeAgentController_research, request, response });

                const controller = new KnowledgeAgentController();

              await templateService.apiHandler({
                methodName: 'research',
                controller,
                response,
                next,
                validatedArgs,
                successStatus: 200,
              });
            } catch (err) {
                return next(err);
            }
        });
        // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
        const argsKnowledgeAgentController_factCheck: Record<string, TsoaRoute.ParameterSchema> = {
                body: {"in":"body","name":"body","required":true,"ref":"KnowledgeFactCheckRequest"},
        };
        app.post('/api/knowledge/fact-check',
            ...(fetchMiddlewares<RequestHandler>(KnowledgeAgentController)),
            ...(fetchMiddlewares<RequestHandler>(KnowledgeAgentController.prototype.factCheck)),

            async function KnowledgeAgentController_factCheck(request: ExRequest, response: ExResponse, next: any) {

            // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

            let validatedArgs: any[] = [];
            try {
                validatedArgs = templateService.getValidatedArgs({ args: argsKnowledgeAgentController_factCheck, request, response });

                const controller = new KnowledgeAgentController();

              await templateService.apiHandler({
                methodName: 'factCheck',
                controller,
                response,
                next,
                validatedArgs,
                successStatus: 200,
              });
            } catch (err) {
                return next(err);
            }
        });
        // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
        const argsKnowledgeAgentController_summarize: Record<string, TsoaRoute.ParameterSchema> = {
                body: {"in":"body","name":"body","required":true,"ref":"KnowledgeSummarizeRequest"},
        };
        app.post('/api/knowledge/summarize',
            ...(fetchMiddlewares<RequestHandler>(KnowledgeAgentController)),
            ...(fetchMiddlewares<RequestHandler>(KnowledgeAgentController.prototype.summarize)),

            async function KnowledgeAgentController_summarize(request: ExRequest, response: ExResponse, next: any) {

            // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

            let validatedArgs: any[] = [];
            try {
                validatedArgs = templateService.getValidatedArgs({ args: argsKnowledgeAgentController_summarize, request, response });

                const controller = new KnowledgeAgentController();

              await templateService.apiHandler({
                methodName: 'summarize',
                controller,
                response,
                next,
                validatedArgs,
                successStatus: 200,
              });
            } catch (err) {
                return next(err);
            }
        });
        // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
        const argsDialogueAgentController_getHealth: Record<string, TsoaRoute.ParameterSchema> = {
        };
        app.get('/api/dialogue/health',
            ...(fetchMiddlewares<RequestHandler>(DialogueAgentController)),
            ...(fetchMiddlewares<RequestHandler>(DialogueAgentController.prototype.getHealth)),

            async function DialogueAgentController_getHealth(request: ExRequest, response: ExResponse, next: any) {

            // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

            let validatedArgs: any[] = [];
            try {
                validatedArgs = templateService.getValidatedArgs({ args: argsDialogueAgentController_getHealth, request, response });

                const controller = new DialogueAgentController();

              await templateService.apiHandler({
                methodName: 'getHealth',
                controller,
                response,
                next,
                validatedArgs,
                successStatus: 200,
              });
            } catch (err) {
                return next(err);
            }
        });
        // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
        const argsDialogueAgentController_getMetrics: Record<string, TsoaRoute.ParameterSchema> = {
        };
        app.get('/api/dialogue/metrics',
            ...(fetchMiddlewares<RequestHandler>(DialogueAgentController)),
            ...(fetchMiddlewares<RequestHandler>(DialogueAgentController.prototype.getMetrics)),

            async function DialogueAgentController_getMetrics(request: ExRequest, response: ExResponse, next: any) {

            // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

            let validatedArgs: any[] = [];
            try {
                validatedArgs = templateService.getValidatedArgs({ args: argsDialogueAgentController_getMetrics, request, response });

                const controller = new DialogueAgentController();

              await templateService.apiHandler({
                methodName: 'getMetrics',
                controller,
                response,
                next,
                validatedArgs,
                successStatus: 200,
              });
            } catch (err) {
                return next(err);
            }
        });
        // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
        const argsDialogueAgentController_respond: Record<string, TsoaRoute.ParameterSchema> = {
                body: {"in":"body","name":"body","required":true,"ref":"DialogueRespondRequest"},
        };
        app.post('/api/dialogue/respond',
            ...(fetchMiddlewares<RequestHandler>(DialogueAgentController)),
            ...(fetchMiddlewares<RequestHandler>(DialogueAgentController.prototype.respond)),

            async function DialogueAgentController_respond(request: ExRequest, response: ExResponse, next: any) {

            // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

            let validatedArgs: any[] = [];
            try {
                validatedArgs = templateService.getValidatedArgs({ args: argsDialogueAgentController_respond, request, response });

                const controller = new DialogueAgentController();

              await templateService.apiHandler({
                methodName: 'respond',
                controller,
                response,
                next,
                validatedArgs,
                successStatus: 200,
              });
            } catch (err) {
                return next(err);
            }
        });
        // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa


    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
}

// WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
