
starting build "66cec0f5-0509-4c41-b0e7-72ac6e7d86a2"
FETCHSOURCE
Sending build context to Docker daemon  1.937MB
Step 1/10 : FROM node:20-alpine
20-alpine: Pulling from library/node
6a0ac1617861: Already exists
4feea04c1543: Pulling fs layer
b2cbbfe903b0: Pulling fs layer
fff4e2c1b189: Pulling fs layer
fff4e2c1b189: Verifying Checksum
fff4e2c1b189: Download complete
b2cbbfe903b0: Verifying Checksum
b2cbbfe903b0: Download complete
4feea04c1543: Verifying Checksum
4feea04c1543: Download complete
4feea04c1543: Pull complete
b2cbbfe903b0: Pull complete
fff4e2c1b189: Pull complete
Digest: sha256:fb4cd12c85ee03686f6af5362a0b0d56d50c58a04632e6c0fb8363f609372293
Status: Downloaded newer image for node:20-alpine
 ---> 11cedc39e663
Step 2/10 : WORKDIR /app
 ---> Running in 9ea585c1d248
Removing intermediate container 9ea585c1d248
 ---> d1b088ad2bab
Step 3/10 : COPY . .
 ---> 2b564ee5fb64
Step 4/10 : RUN npm ci
 ---> Running in 116c49fc24c7
npm warn EBADENGINE Unsupported engine {
npm warn EBADENGINE   package: 'concurrently@10.0.3',
npm warn EBADENGINE   required: { node: '>=22' },
npm warn EBADENGINE   current: { node: 'v20.20.2', npm: '10.8.2' }
npm warn EBADENGINE }
npm warn deprecated node-domexception@1.0.0: Use your platform's native DOMException instead
npm warn deprecated glob@10.5.0: Old versions of glob are not supported, and contain widely publicized security vulnerabilities, which have been fixed in the current version. Please update. Support for old versions may be purchased (at exorbitant rates) by contacting i@izs.me
npm warn deprecated uuid@10.0.0: uuid@10 and below is no longer supported.  For ESM codebases, update to uuid@latest.  For CommonJS codebases, use uuid@11 (but be aware this version will likely be deprecated in 2028).
npm warn deprecated uuid@9.0.1: uuid@10 and below is no longer supported.  For ESM codebases, update to uuid@latest.  For CommonJS codebases, use uuid@11 (but be aware this version will likely be deprecated in 2028).
npm warn deprecated uuid@9.0.1: uuid@10 and below is no longer supported.  For ESM codebases, update to uuid@latest.  For CommonJS codebases, use uuid@11 (but be aware this version will likely be deprecated in 2028).
npm warn deprecated uuid@9.0.1: uuid@10 and below is no longer supported.  For ESM codebases, update to uuid@latest.  For CommonJS codebases, use uuid@11 (but be aware this version will likely be deprecated in 2028).
npm warn deprecated three-mesh-bvh@0.7.8: Deprecated due to three.js version incompatibility. Please use v0.8.0, instead.
added 535 packages, and audited 542 packages in 23s
73 packages are looking for funding
  run `npm fund` for details
10 vulnerabilities (9 moderate, 1 high)
To address issues that do not require attention, run:
  npm audit fix
To address all issues (including breaking changes), run:
  npm audit fix --force
Run `npm audit` for details.
npm notice
npm notice New major version of npm available! 10.8.2 -> 11.17.0
npm notice Changelog: https://github.com/npm/cli/releases/tag/v11.17.0
npm notice To update run: npm install -g npm@11.17.0
npm notice
Removing intermediate container 116c49fc24c7
 ---> c5221b94962d
Step 5/10 : RUN npm run build -w packages/shared
 ---> Running in ae6e26ca75fd
> @civicmind/shared@1.0.0 build
> tsc
Removing intermediate container ae6e26ca75fd
 ---> 36bc98adbed3
Step 6/10 : RUN npm run build -w packages/backend
 ---> Running in f705657eef67
> @civicmind/backend@1.0.0 build
> tsc
Removing intermediate container f705657eef67
 ---> ac96feaa17e7
Step 7/10 : ENV NODE_ENV=production
 ---> Running in 790dafe52667
Removing intermediate container 790dafe52667
 ---> 18c153c40765
Step 8/10 : ENV PORT=8080
 ---> Running in 18a2160183ac
Removing intermediate container 18a2160183ac
 ---> eb8b9578f63f
Step 9/10 : EXPOSE 8080
 ---> Running in 43ba198da859
Removing intermediate container 43ba198da859
 ---> 03e0a9729f52
Step 10/10 : CMD ["npm", "start", "-w", "packages/backend"]
 ---> Running in 1f13cb654adc
Removing intermediate container 1f13cb654adc
 ---> bc21ca0e6014
Successfully built bc21ca0e6014
Successfully tagged asia-south1-docker.pkg.dev/civicsense-ec813/cloud-run-source-deploy/civicmind/civicmind:4b866cc30be9edb22417d63e8ceb596e60fa8379
Finished Step #0 - "Build"
Starting Step #1 - "Push"
Already have image (with digest): gcr.io/cloud-builders/docker
The push refers to repository [asia-south1-docker.pkg.dev/civicsense-ec813/cloud-run-source-deploy/civicmind/civicmind]
3b76d8329268: Preparing
69fae43d6e51: Preparing
18544272cb9d: Preparing
9985da52474a: Preparing
68babe3e2672: Preparing
afa543f85b46: Preparing
e10358715ead: Preparing
4983b93ee796: Preparing
29df493baa13: Preparing
68babe3e2672: Pushed
69fae43d6e51: Pushed
3b76d8329268: Pushed
9985da52474a: Pushed
afa543f85b46: Pushed
e10358715ead: Pushed
29df493baa13: Pushed
4983b93ee796: Pushed
18544272cb9d: Pushed
4b866cc30be9edb22417d63e8ceb596e60fa8379: digest: sha256:7855a487fba6f1d25c0159c219416c09d681cfb6e61008c0015a7bf618653cc4 size: 2207
Finished Step #1 - "Push"
Starting Step #2 - "Deploy"
Pulling image: gcr.io/google.com/cloudsdktool/cloud-sdk:slim
slim: Pulling from google.com/cloudsdktool/cloud-sdk
72c03230f136: Already exists
123e17899fb5: Pulling fs layer
6c2eaf42c939: Pulling fs layer
3182c9f829c4: Pulling fs layer
3182c9f829c4: Download complete
123e17899fb5: Verifying Checksum
123e17899fb5: Download complete
123e17899fb5: Pull complete
6c2eaf42c939: Verifying Checksum
6c2eaf42c939: Download complete
6c2eaf42c939: Pull complete
3182c9f829c4: Pull complete
Digest: sha256:e379150995766ed2575edcfc6183e6fe212ed7def3465e7aad0b59d7de8392da
Status: Downloaded newer image for gcr.io/google.com/cloudsdktool/cloud-sdk:slim
gcr.io/google.com/cloudsdktool/cloud-sdk:slim
Deploying...
Creating Revision......................................................................................................................................................................................................................................................................................................................................................................................................failed
Deployment failed
ERROR: (gcloud.run.services.update) The user-provided container failed to start and listen on the port defined provided by the PORT=8080 environment variable within the allocated timeout. This can happen when the container port is misconfigured or if the timeout is too short. The health check timeout can be extended. Logs for this revision might contain more information.
Logs URL: https://console.cloud.google.com/logs/viewer?project=civicsense-ec813&resource=cloud_run_revision/service_name/civicmind/revision_name/civicmind-00003-zk7&advancedFilter=resource.type%3D%22cloud_run_revision%22%0Aresource.labels.service_name%3D%22civicmind%22%0Aresource.labels.revision_name%3D%22civicmind-00003-zk7%22 
For more troubleshooting guidance, see https://cloud.google.com/run/docs/troubleshooting#container-failed-to-start
Finished Step #2 - "Deploy"
ERROR
ERROR: build step 2 "gcr.io/google.com/cloudsdktool/cloud-sdk:s