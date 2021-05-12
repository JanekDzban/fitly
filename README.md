# fitly
### Synchronize data between [dietly](https://dietly.pl) and [fitatu](https://fitatu.com)

### How to run:
* Clone the repository
* Setup your credentials for dietly and fitatu in `.env_example` file (fitatu user id can be obtained from login response for fitatu.com/login endpoint)
* Rename `.env_example` file to `.env` 
* Inside `fitatu` folder run `npm start {date_to_sync}` (e.g. `npm start 2021-05-13`)
